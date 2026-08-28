import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, cfCors, cfJson, checkEntitlement, requireMember } from "../_shared/client-finder.ts";
import {
  bodyToHtml,
  emailDomain,
  isValidEmail,
  renderTemplate,
  sendIdempotencyKey,
} from "../_shared/client-finder-send.ts";

type Admin = ReturnType<typeof adminClient>;

async function loadCampaign(admin: Admin, workspaceId: string, campaignId: string) {
  const { data } = await admin
    .from("prospecting_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data;
}

async function suppressionSet(admin: Admin, workspaceId: string) {
  const [{ data: local }, { data: global }] = await Promise.all([
    admin.from("prospecting_suppressions").select("email, domain").eq("workspace_id", workspaceId),
    admin.from("suppressed_emails").select("email"),
  ]);
  const emails = new Set<string>();
  const domains = new Set<string>();
  (local ?? []).forEach((r: any) => {
    if (r.email) emails.add(String(r.email).toLowerCase());
    if (r.domain) domains.add(String(r.domain).toLowerCase());
  });
  (global ?? []).forEach((r: any) => r.email && emails.add(String(r.email).toLowerCase()));
  return { emails, domains };
}

function contactVars(contact: any, company: any, senderName: string, bookingUrl: string) {
  return {
    first_name: contact.first_name || String(contact.full_name || "").split(" ")[0] || "",
    full_name: contact.full_name || "",
    company: company?.name || "",
    job_title: contact.job_title || "",
    industry: company?.industry || "",
    city: company?.city || "",
    country: company?.country || contact.country || "",
    sender_name: senderName,
    booking_url: bookingUrl,
  };
}

/** Everything that must be true before a campaign may be launched. */
async function readiness(admin: Admin, workspaceId: string, campaign: any) {
  const checks: Array<{ key: string; label: string; ok: boolean; detail?: string }> = [];

  const { data: steps } = await admin
    .from("prospecting_sequence_steps")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("step_number");

  const stepsOk = (steps ?? []).length > 0 &&
    (steps ?? []).every((s: any) => s.subject_template.trim() && s.body_template.trim());
  checks.push({
    key: "steps",
    label: "Sequence has at least one email with a subject and body",
    ok: stepsOk,
    detail: `${(steps ?? []).length} step(s)`,
  });

  const senderOk = !!campaign.from_email && isValidEmail(campaign.from_email) && !!campaign.from_name;
  checks.push({
    key: "sender",
    label: "Sender name and a valid from address are set",
    ok: senderOk,
    detail: campaign.from_email || "not set",
  });

  const { data: senderSettings } = await admin
    .from("email_settings")
    .select("id, from_email, provider")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  checks.push({
    key: "email_channel",
    label: "Workspace email channel is configured",
    ok: !!senderSettings,
    detail: senderSettings ? `provider: ${senderSettings.provider ?? "default"}` : "using platform sender",
  });

  const { count: approvedCount } = await admin
    .from("prospecting_enrolments")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .eq("status", "approved");
  checks.push({
    key: "prospects",
    label: "At least one approved prospect is enrolled",
    ok: (approvedCount ?? 0) > 0,
    detail: `${approvedCount ?? 0} approved`,
  });

  const offerOk = !!campaign.offer_id;
  checks.push({ key: "offer", label: "An offer is attached", ok: offerOk });

  // Merge variables must all resolve for every approved enrolment.
  let unresolved = 0;
  if (stepsOk && (approvedCount ?? 0) > 0) {
    const { data: enrolments } = await admin
      .from("prospecting_enrolments")
      .select("id, contact_id, company_id")
      .eq("campaign_id", campaign.id)
      .eq("status", "approved")
      .limit(500);
    const contactIds = (enrolments ?? []).map((e: any) => e.contact_id);
    const { data: contacts } = await admin
      .from("prospect_contacts")
      .select("*")
      .in("id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]);
    const companyIds = [...new Set((contacts ?? []).map((c: any) => c.company_id).filter(Boolean))];
    const { data: companies } = companyIds.length
      ? await admin.from("prospect_companies").select("*").in("id", companyIds)
      : { data: [] as any[] };
    const companyById = new Map((companies ?? []).map((c: any) => [c.id, c]));

    for (const c of contacts ?? []) {
      const vars = contactVars(c, companyById.get(c.company_id), campaign.from_name || "", "");
      for (const s of steps ?? []) {
        const a = renderTemplate(s.subject_template, vars);
        const b = renderTemplate(s.body_template, vars);
        if (a.missing.length || b.missing.length || a.unknown.length || b.unknown.length) unresolved++;
      }
    }
  }
  checks.push({
    key: "merge_vars",
    label: "Every personalisation token resolves for every enrolled prospect",
    ok: unresolved === 0,
    detail: unresolved === 0 ? "all resolved" : `${unresolved} email(s) would have an empty token`,
  });

  return { checks, ready: checks.every((c) => c.ok) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cfCors });

  const admin = adminClient();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return cfJson({ error: "Invalid JSON body" }, 400);
  }

  const workspaceId: string = body.workspace_id ?? "";
  const gate = await requireMember(req, admin, workspaceId);
  if (gate instanceof Response) return gate;
  const { userId } = gate;

  const action: string = body.action ?? "";
  const campaignId: string = body.campaign_id ?? "";
  const campaign = campaignId ? await loadCampaign(admin, workspaceId, campaignId) : null;
  if (campaignId && !campaign) return cfJson({ error: "Campaign not found." }, 404);

  const audit = (actionName: string, detail: Record<string, unknown>) =>
    admin.from("prospecting_audit_events").insert({
      workspace_id: workspaceId, user_id: userId, action: actionName,
      entity_type: "campaign", entity_id: campaignId || null, detail,
    });

  /* ---------------------------- Enrol prospects ---------------------------- */
  if (action === "enrol") {
    const contactIds: string[] = Array.isArray(body.contact_ids) ? body.contact_ids.slice(0, 1000) : [];
    if (!contactIds.length) return cfJson({ error: "Select at least one prospect." }, 400);

    const { data: contacts } = await admin
      .from("prospect_contacts")
      .select("id, workspace_id, company_id, email, do_not_contact, status")
      .eq("workspace_id", workspaceId)
      .in("id", contactIds);

    const { emails, domains } = await suppressionSet(admin, workspaceId);
    const skipped: Array<{ id: string; reason: string }> = [];
    const rows: any[] = [];

    for (const c of contacts ?? []) {
      const email = String(c.email ?? "").trim().toLowerCase();
      if (!email || !isValidEmail(email)) { skipped.push({ id: c.id, reason: "no valid email address" }); continue; }
      if (c.do_not_contact) { skipped.push({ id: c.id, reason: "marked do-not-contact" }); continue; }
      if (emails.has(email)) { skipped.push({ id: c.id, reason: "email is suppressed" }); continue; }
      if (domains.has(emailDomain(email))) { skipped.push({ id: c.id, reason: "domain is suppressed" }); continue; }
      rows.push({
        workspace_id: workspaceId, campaign_id: campaignId, contact_id: c.id,
        company_id: c.company_id, status: "pending_approval",
      });
    }

    let added = 0;
    if (rows.length) {
      const { data: ins, error } = await admin
        .from("prospecting_enrolments")
        .upsert(rows, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true })
        .select("id");
      if (error) return cfJson({ error: error.message }, 500);
      added = (ins ?? []).length;
    }
    await audit("prospects_enrolled", { requested: contactIds.length, added, skipped: skipped.length });
    return cfJson({ ok: true, added, skipped });
  }

  /* --------------------------- Approve enrolments -------------------------- */
  if (action === "approve_enrolments") {
    const ids: string[] = Array.isArray(body.enrolment_ids) ? body.enrolment_ids.slice(0, 1000) : [];
    if (!ids.length) return cfJson({ error: "Select at least one prospect to approve." }, 400);
    const { data, error } = await admin
      .from("prospecting_enrolments")
      .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("campaign_id", campaignId)
      .eq("status", "pending_approval")
      .in("id", ids)
      .select("id");
    if (error) return cfJson({ error: error.message }, 500);
    await audit("enrolments_approved", { count: (data ?? []).length });
    return cfJson({ ok: true, approved: (data ?? []).length });
  }

  if (action === "reject_enrolments") {
    const ids: string[] = Array.isArray(body.enrolment_ids) ? body.enrolment_ids.slice(0, 1000) : [];
    const { data, error } = await admin
      .from("prospecting_enrolments")
      .update({ status: "rejected", stopped_at: new Date().toISOString(), stop_reason: "rejected in approval queue" })
      .eq("workspace_id", workspaceId)
      .eq("campaign_id", campaignId)
      .in("id", ids)
      .select("id");
    if (error) return cfJson({ error: error.message }, 500);
    await audit("enrolments_rejected", { count: (data ?? []).length });
    return cfJson({ ok: true, rejected: (data ?? []).length });
  }

  /* -------------------------------- Preview -------------------------------- */
  if (action === "preview") {
    const { data: steps } = await admin
      .from("prospecting_sequence_steps").select("*").eq("campaign_id", campaignId).order("step_number");
    const { data: contact } = await admin
      .from("prospect_contacts").select("*").eq("id", body.contact_id).eq("workspace_id", workspaceId).maybeSingle();
    if (!contact) return cfJson({ error: "Prospect not found." }, 404);
    const { data: company } = contact.company_id
      ? await admin.from("prospect_companies").select("*").eq("id", contact.company_id).maybeSingle()
      : { data: null as any };

    const vars = contactVars(contact, company, campaign?.from_name || "", "");
    const rendered = (steps ?? []).map((s: any) => {
      const subj = renderTemplate(s.subject_template, vars);
      const bd = renderTemplate(s.body_template, vars);
      return {
        step_number: s.step_number,
        delay_days: s.delay_days,
        subject: subj.text,
        body: bd.text,
        evidence: s.evidence ?? [],
        problems: [...new Set([...subj.missing, ...bd.missing])].map((v) => `No value for {{${v}}}`)
          .concat([...new Set([...subj.unknown, ...bd.unknown])].map((v) => `Unsupported token {{${v}}}`)),
      };
    });
    return cfJson({ ok: true, contact: { id: contact.id, full_name: contact.full_name, email: contact.email }, steps: rendered });
  }

  /* ------------------------------- Readiness ------------------------------- */
  if (action === "readiness") {
    if (!campaign) return cfJson({ error: "campaign_id is required" }, 400);
    return cfJson({ ok: true, ...(await readiness(admin, workspaceId, campaign)) });
  }

  /* ------------------------------- Test send ------------------------------- */
  if (action === "test_send") {
    const allowance = await checkEntitlement(admin, workspaceId, "emails");
    if (allowance) return allowance;

    if (!campaign) return cfJson({ error: "campaign_id is required" }, 400);
    const to = String(body.to ?? "").trim();
    if (!isValidEmail(to)) return cfJson({ error: "Enter a valid email address for the test." }, 400);

    const { data: steps } = await admin
      .from("prospecting_sequence_steps").select("*").eq("campaign_id", campaignId).order("step_number").limit(1);
    const step = (steps ?? [])[0];
    if (!step) return cfJson({ error: "Add at least one email to the sequence first." }, 400);

    const vars = {
      first_name: "Sam", full_name: "Sam Example", company: "Example Ltd",
      job_title: "Operations Director", industry: "Professional services",
      city: "London", country: "United Kingdom",
      sender_name: campaign.from_name || "", booking_url: "",
    };
    const subj = renderTemplate(step.subject_template, vars);
    const bd = renderTemplate(step.body_template, vars);

    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        workspaceId, to, subject: `[TEST] ${subj.text}`,
        html: bodyToHtml(bd.text),
        templateSettings: { preview: true },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return cfJson({ error: data?.error || `Email service returned ${res.status}` }, 502);
    }
    await audit("test_send", { to });
    return cfJson({ ok: true, message: "Test email submitted to the email service." });
  }

  /* --------------------------------- Launch -------------------------------- */
  if (action === "launch") {
    const allowance = await checkEntitlement(admin, workspaceId, "emails");
    if (allowance) return allowance;

    if (!campaign) return cfJson({ error: "campaign_id is required" }, 400);
    if (body.confirm !== true) return cfJson({ error: "Launch must be explicitly confirmed." }, 400);

    const r = await readiness(admin, workspaceId, campaign);
    if (!r.ready) {
      return cfJson({ error: "This campaign is not ready to launch.", checks: r.checks }, 400);
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("prospecting_campaigns")
      .update({
        status: "active", approved_by: userId, approved_at: now,
        launched_at: campaign.launched_at ?? now, paused_at: null, paused_reason: null,
      })
      .eq("id", campaignId);
    if (error) return cfJson({ error: error.message }, 500);

    // Approved enrolments become active and are due for their first step.
    const { data: activated } = await admin
      .from("prospecting_enrolments")
      .update({ status: "active", next_send_at: now, current_step: 0 })
      .eq("campaign_id", campaignId)
      .eq("status", "approved")
      .select("id");

    await audit("campaign_launched", { activated: (activated ?? []).length });
    return cfJson({ ok: true, activated: (activated ?? []).length });
  }

  if (action === "pause" || action === "resume" || action === "stop") {
    if (!campaign) return cfJson({ error: "campaign_id is required" }, 400);
    const patch =
      action === "pause"
        ? { status: "paused", paused_at: new Date().toISOString(), paused_reason: String(body.reason ?? "paused by user").slice(0, 300) }
        : action === "resume"
          ? { status: "active", paused_at: null, paused_reason: null }
          : { status: "stopped", paused_at: new Date().toISOString(), paused_reason: "stopped by user" };
    const { error } = await admin.from("prospecting_campaigns").update(patch).eq("id", campaignId);
    if (error) return cfJson({ error: error.message }, 500);
    if (action === "stop") {
      await admin
        .from("prospecting_enrolments")
        .update({ status: "stopped", stopped_at: new Date().toISOString(), stop_reason: "campaign stopped" })
        .eq("campaign_id", campaignId)
        .in("status", ["active", "approved", "pending_approval"]);
      await admin
        .from("prospecting_outbound_emails")
        .update({ status: "cancelled" })
        .eq("campaign_id", campaignId)
        .eq("status", "queued");
    }
    await audit(`campaign_${action}`, { reason: (patch as any).paused_reason ?? null });
    return cfJson({ ok: true, status: patch.status });
  }

  /* ------------------------------ Suppressions ----------------------------- */
  if (action === "suppress") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const domain = String(body.domain ?? "").trim().toLowerCase();
    if (!email && !domain) return cfJson({ error: "Provide an email address or a domain." }, 400);
    if (email && !isValidEmail(email)) return cfJson({ error: "That email address is not valid." }, 400);
    const { error } = await admin.from("prospecting_suppressions").upsert(
      { workspace_id: workspaceId, created_by: userId, email: email || null, domain: domain || null, reason: String(body.reason ?? "manual").slice(0, 200) },
      { onConflict: email ? "workspace_id,email" : "workspace_id,domain", ignoreDuplicates: true },
    );
    if (error) return cfJson({ error: error.message }, 500);

    // Stop anyone already enrolled who matches.
    if (email) {
      const { data: matches } = await admin.from("prospect_contacts").select("id").eq("workspace_id", workspaceId).ilike("email", email);
      const ids = (matches ?? []).map((m: any) => m.id);
      if (ids.length) {
        await admin.from("prospecting_enrolments")
          .update({ status: "stopped", stopped_at: new Date().toISOString(), stop_reason: "suppressed" })
          .eq("workspace_id", workspaceId).in("contact_id", ids).in("status", ["pending_approval", "approved", "active"]);
      }
    }
    await audit("suppression_added", { email: email || null, domain: domain || null });
    return cfJson({ ok: true });
  }

  return cfJson({ error: `Unknown action: ${action}` }, 400);
});

// Referenced so the idempotency helper stays in one place with the worker.
export { sendIdempotencyKey };
