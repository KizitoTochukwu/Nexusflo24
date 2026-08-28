// AI Client Finder — reply intelligence and CRM writeback.
// Replies are logged (manually or by a mailbox sync), classified by AI,
// correctable by a human, and only written to the CRM on explicit request.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callNexusModel } from "../_shared/nexus-ai-core.ts";
import {
  adminClient,
  cfCors,
  cfJson,
  logUsage,
  parseModelJson,
  requireMember,
} from "../_shared/client-finder.ts";
import { emailDomain, isValidEmail } from "../_shared/client-finder-send.ts";

type Admin = ReturnType<typeof adminClient>;

export const REPLY_CLASSES = [
  "interested",
  "meeting_request",
  "question",
  "referral",
  "not_now",
  "not_interested",
  "wrong_person",
  "unsubscribe",
  "out_of_office",
  "auto_reply",
  "bounce",
] as const;

/** Classes that should end the sequence for that prospect. */
const STOP_CLASSES = new Set([
  "interested", "meeting_request", "question", "referral",
  "not_now", "not_interested", "wrong_person", "unsubscribe", "bounce",
]);
/** Classes that mean we must never email this address again. */
const SUPPRESS_CLASSES = new Set(["unsubscribe", "not_interested", "bounce"]);
/** Classes that justify a CRM deal. */
const DEAL_CLASSES = new Set(["interested", "meeting_request"]);

const CLASSIFY_SYSTEM = `You classify a single reply to a cold sales email.
Use ONLY the reply text supplied. Never invent facts about the sender.
Choose exactly one class from: ${REPLY_CLASSES.join(", ")}.
"confidence" is 0-1 and must be low when the reply is short or ambiguous.
"reason" is one plain sentence quoting or paraphrasing the wording that decided it.
Reply with JSON only: {"classification":"","confidence":0,"reason":""}`;

const DRAFT_SYSTEM = `You draft a short reply from a salesperson to a prospect who answered a cold email.
Rules:
- Use only the supplied context. Never invent case studies, numbers, names or promises.
- 60-110 words, plain sentences, no marketing adjectives, no emojis.
- End with one clear next step.
This draft is a suggestion for a human to review. Reply with JSON only: {"subject":"","body":""}`;

async function loadReply(admin: Admin, workspaceId: string, id: string) {
  const { data } = await admin
    .from("prospecting_replies").select("*")
    .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  return data;
}

/** Apply the consequences of a classification: stop, suppress, mark the enrolment. */
async function applyOutcome(admin: Admin, reply: any, classification: string) {
  const now = new Date().toISOString();

  if (reply.enrolment_id) {
    const patch: Record<string, unknown> = {
      replied_at: reply.received_at ?? now,
      reply_classification: classification,
    };
    if (STOP_CLASSES.has(classification)) {
      patch.status = "stopped";
      patch.next_send_at = null;
      patch.stopped_at = now;
      patch.stop_reason = `reply classified as ${classification.replace(/_/g, " ")}`;
    }
    await admin.from("prospecting_enrolments").update(patch).eq("id", reply.enrolment_id);
  }

  if (SUPPRESS_CLASSES.has(classification) && isValidEmail(reply.from_email)) {
    const suppressEmail = String(reply.from_email).toLowerCase();
    const { data: alreadySuppressed } = await admin
      .from("prospecting_suppressions").select("id")
      .eq("workspace_id", reply.workspace_id).ilike("email", suppressEmail).maybeSingle();
    if (!alreadySuppressed) {
      await admin.from("prospecting_suppressions").insert({
        workspace_id: reply.workspace_id,
        email: suppressEmail,
        reason: `reply classified as ${classification.replace(/_/g, " ")}`,
      });
    }
    if (reply.contact_id) {
      await admin.from("prospect_contacts")
        .update({ do_not_contact: true }).eq("id", reply.contact_id);
    }
  }
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
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  const audit = (name: string, entityId: string | null, detail: Record<string, unknown>) =>
    admin.from("prospecting_audit_events").insert({
      workspace_id: workspaceId, user_id: userId, action: name,
      entity_type: "reply", entity_id: entityId, detail,
    });

  /* ------------------------------- Log a reply ------------------------------ */
  if (action === "log_reply") {
    const fromEmail = String(body.from_email ?? "").trim().toLowerCase();
    const text = String(body.body_text ?? "").trim();
    if (!isValidEmail(fromEmail)) return cfJson({ error: "Enter the sender's email address." }, 400);
    if (!text) return cfJson({ error: "Paste the reply text." }, 400);

    // Attach to the most recent enrolment for that address when we can find one.
    let enrolmentId: string | null = body.enrolment_id ?? null;
    let contactId: string | null = body.contact_id ?? null;
    let campaignId: string | null = body.campaign_id ?? null;

    if (!enrolmentId) {
      const { data: contact } = await admin
        .from("prospect_contacts").select("id")
        .eq("workspace_id", workspaceId).ilike("email", fromEmail).maybeSingle();
      if (contact) {
        contactId = contact.id;
        const { data: enr } = await admin
          .from("prospecting_enrolments").select("id, campaign_id")
          .eq("workspace_id", workspaceId).eq("contact_id", contact.id)
          .order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (enr) { enrolmentId = enr.id; campaignId = campaignId ?? enr.campaign_id; }
      }
    }

    const { data: inserted, error } = await admin
      .from("prospecting_replies")
      .insert({
        workspace_id: workspaceId, campaign_id: campaignId, enrolment_id: enrolmentId,
        contact_id: contactId, source: "manual", from_email: fromEmail,
        subject: body.subject ?? null, body_text: text.slice(0, 20_000),
        received_at: body.received_at ?? new Date().toISOString(), created_by: userId,
      })
      .select("*").maybeSingle();
    if (error || !inserted) return cfJson({ error: error?.message ?? "Could not save the reply." }, 500);

    await audit("reply_logged", inserted.id, { from_email: fromEmail, matched_enrolment: !!enrolmentId });
    return cfJson({ ok: true, reply: inserted, matched_enrolment: !!enrolmentId });
  }

  /* -------------------------------- Classify -------------------------------- */
  if (action === "classify") {
    if (!apiKey) return cfJson({ error: "AI is not configured for this project." }, 500);
    const reply = await loadReply(admin, workspaceId, body.reply_id ?? "");
    if (!reply) return cfJson({ error: "Reply not found." }, 404);

    const { text, error } = await callNexusModel({
      apiKey,
      system: CLASSIFY_SYSTEM,
      messages: [{
        role: "user",
        content: `Subject: ${reply.subject ?? "(none)"}\nFrom: ${reply.from_email}\n\n${reply.body_text}`,
      }],
      reasoning: "low",
    });
    if (error) {
      await logUsage(admin, {
        workspace_id: workspaceId, user_id: userId, operation: "classify_reply",
        entity_type: "reply", entity_id: reply.id, status: "error", error_class: String(error.status),
      });
      return cfJson({ error: error.message }, error.status);
    }

    const parsed = parseModelJson<{ classification: string; confidence: number; reason: string }>(text);
    const cls = parsed && (REPLY_CLASSES as readonly string[]).includes(parsed.classification)
      ? parsed.classification
      : null;
    if (!cls) return cfJson({ error: "The reply could not be classified. Set the outcome manually." }, 422);

    const confidence = Math.max(0, Math.min(1, Number(parsed!.confidence) || 0));
    await admin.from("prospecting_replies").update({
      classification: cls,
      classification_confidence: confidence,
      classification_reason: String(parsed!.reason ?? "").slice(0, 500),
    }).eq("id", reply.id);

    await applyOutcome(admin, reply, cls);
    await logUsage(admin, {
      workspace_id: workspaceId, user_id: userId, operation: "classify_reply",
      entity_type: "reply", entity_id: reply.id, status: "success",
    });
    await audit("reply_classified", reply.id, { classification: cls, confidence });
    return cfJson({ ok: true, classification: cls, confidence, reason: parsed!.reason });
  }

  /* ------------------------- Human correction (audited) --------------------- */
  if (action === "correct") {
    const cls = String(body.classification ?? "");
    if (!(REPLY_CLASSES as readonly string[]).includes(cls)) {
      return cfJson({ error: "Choose a valid outcome." }, 400);
    }
    const reply = await loadReply(admin, workspaceId, body.reply_id ?? "");
    if (!reply) return cfJson({ error: "Reply not found." }, 404);

    await admin.from("prospecting_replies").update({
      corrected_classification: cls,
      corrected_by: userId,
      corrected_at: new Date().toISOString(),
    }).eq("id", reply.id);
    await applyOutcome(admin, reply, cls);
    await audit("reply_classification_corrected", reply.id, {
      from: reply.classification, to: cls,
    });
    return cfJson({ ok: true, classification: cls });
  }

  /* ------------------------------ Mark handled ------------------------------ */
  if (action === "set_handled") {
    const reply = await loadReply(admin, workspaceId, body.reply_id ?? "");
    if (!reply) return cfJson({ error: "Reply not found." }, 404);
    await admin.from("prospecting_replies")
      .update({ handled: body.handled !== false }).eq("id", reply.id);
    return cfJson({ ok: true });
  }

  /* --------------------------- CRM writeback (explicit) --------------------- */
  if (action === "sync_crm") {
    const reply = await loadReply(admin, workspaceId, body.reply_id ?? "");
    if (!reply) return cfJson({ error: "Reply not found." }, 404);
    if (reply.crm_synced_at) {
      return cfJson({ ok: true, already: true, crm_contact_id: reply.crm_contact_id, crm_deal_id: reply.crm_deal_id });
    }

    const { data: prospect } = reply.contact_id
      ? await admin.from("prospect_contacts").select("*").eq("id", reply.contact_id).maybeSingle()
      : { data: null as any };
    const { data: prospectCompany } = prospect?.company_id
      ? await admin.from("prospect_companies").select("*").eq("id", prospect.company_id).maybeSingle()
      : { data: null as any };

    // Company first, deduplicated on domain.
    let crmCompanyId: string | null = prospectCompany?.crm_company_id ?? null;
    const domain = prospectCompany?.domain || emailDomain(reply.from_email);
    if (!crmCompanyId && domain) {
      const { data: existing } = await admin
        .from("companies").select("id")
        .eq("workspace_id", workspaceId).ilike("domain", domain).maybeSingle();
      if (existing) crmCompanyId = existing.id;
      else if (prospectCompany) {
        const { data: created } = await admin.from("companies").insert({
          workspace_id: workspaceId, created_by: userId,
          name: prospectCompany.name || domain, domain,
          website: prospectCompany.website_url ?? null,
          industry: prospectCompany.industry ?? null,
          city: prospectCompany.city ?? null,
          country: prospectCompany.country ?? null,
          description: prospectCompany.description ?? null,
          lifecycle_stage: "lead",
        }).select("id").maybeSingle();
        crmCompanyId = created?.id ?? null;
      }
      if (crmCompanyId && prospectCompany) {
        await admin.from("prospect_companies").update({ crm_company_id: crmCompanyId }).eq("id", prospectCompany.id);
      }
    }

    // Contact through the canonical upsert so dedupe rules apply.
    const { data: crmContactId, error: upsertErr } = await admin.rpc("crm_upsert_contact", {
      _workspace_id: workspaceId,
      _email: reply.from_email,
      _full_name: prospect?.full_name ?? null,
      _source: "ai_client_finder",
      _source_table: "prospecting_replies",
      _source_record_id: reply.id,
    });
    if (upsertErr) return cfJson({ error: upsertErr.message }, 500);

    if (crmContactId && crmCompanyId) {
      await admin.from("contacts").update({ company_id: crmCompanyId }).eq("id", crmContactId);
    }
    if (crmContactId && prospect) {
      await admin.from("prospect_contacts").update({ crm_contact_id: crmContactId }).eq("id", prospect.id);
    }

    // Deal only for genuinely positive outcomes.
    const cls = reply.corrected_classification || reply.classification || "";
    let dealId: string | null = null;
    if (DEAL_CLASSES.has(cls)) {
      const { data: pipelineId } = await admin.rpc("ensure_default_pipeline", { _workspace_id: workspaceId });
      const { data: campaign } = reply.campaign_id
        ? await admin.from("prospecting_campaigns").select("crm_pipeline_id, crm_stage_id, name").eq("id", reply.campaign_id).maybeSingle()
        : { data: null as any };
      const usePipeline = campaign?.crm_pipeline_id ?? pipelineId;
      let stageId = campaign?.crm_stage_id ?? null;
      if (!stageId && usePipeline) {
        const { data: stage } = await admin.from("crm_pipeline_stages")
          .select("id").eq("pipeline_id", usePipeline).order("position").limit(1).maybeSingle();
        stageId = stage?.id ?? null;
      }
      // One deal per prospect reply thread.
      const { data: existingDeal } = crmContactId
        ? await admin.from("crm_deals").select("id")
            .eq("workspace_id", workspaceId).eq("contact_id", crmContactId)
            .eq("source", "ai_client_finder").maybeSingle()
        : { data: null as any };
      if (existingDeal) dealId = existingDeal.id;
      else if (usePipeline && stageId) {
        const name = `${prospectCompany?.name || domain || reply.from_email} — ${campaign?.name || "Client Finder"}`;
        const { data: deal, error: dealErr } = await admin.from("crm_deals").insert({
          workspace_id: workspaceId, pipeline_id: usePipeline, stage_id: stageId,
          name, contact_id: crmContactId, company_id: crmCompanyId,
          source: "ai_client_finder", created_by: userId, status: "open",
          description: `Created from a ${cls.replace(/_/g, " ")} reply to an AI Client Finder campaign.`,
        }).select("id").maybeSingle();
        if (dealErr) return cfJson({ error: dealErr.message }, 500);
        dealId = deal?.id ?? null;
      }
    }

    await admin.from("prospecting_replies").update({
      crm_synced_at: new Date().toISOString(),
      crm_contact_id: crmContactId ?? null,
      crm_deal_id: dealId,
    }).eq("id", reply.id);

    if (reply.enrolment_id) {
      await admin.from("prospecting_enrolments").update({
        crm_contact_id: crmContactId ?? null,
        crm_company_id: crmCompanyId,
        crm_deal_id: dealId,
      }).eq("id", reply.enrolment_id);
    }

    await audit("reply_synced_to_crm", reply.id, {
      crm_contact_id: crmContactId, crm_company_id: crmCompanyId, crm_deal_id: dealId,
    });
    return cfJson({
      ok: true, crm_contact_id: crmContactId, crm_company_id: crmCompanyId, crm_deal_id: dealId,
      deal_created: !!dealId,
    });
  }

  /* ---------------------- AI reply draft (approval required) ---------------- */
  if (action === "draft_reply") {
    if (!apiKey) return cfJson({ error: "AI is not configured for this project." }, 500);
    const reply = await loadReply(admin, workspaceId, body.reply_id ?? "");
    if (!reply) return cfJson({ error: "Reply not found." }, 404);

    const { data: campaign } = reply.campaign_id
      ? await admin.from("prospecting_campaigns").select("name, from_name, offer_id, booking_url").eq("id", reply.campaign_id).maybeSingle()
      : { data: null as any };
    const { data: offer } = campaign?.offer_id
      ? await admin.from("prospecting_offers").select("name, short_description, value_proposition").eq("id", campaign.offer_id).maybeSingle()
      : { data: null as any };

    const context = [
      `Their reply: ${reply.body_text}`,
      reply.classification ? `Classified as: ${reply.classification}` : "",
      offer ? `Our offer: ${offer.name}. ${offer.short_description ?? ""} ${offer.value_proposition ?? ""}` : "",
      campaign?.from_name ? `Sign off as: ${campaign.from_name}` : "",
      campaign?.booking_url ? `Booking link that may be offered: ${campaign.booking_url}` : "",
    ].filter(Boolean).join("\n");

    const { text, error } = await callNexusModel({
      apiKey, system: DRAFT_SYSTEM, messages: [{ role: "user", content: context }], reasoning: "low",
    });
    if (error) return cfJson({ error: error.message }, error.status);
    const parsed = parseModelJson<{ subject: string; body: string }>(text);
    if (!parsed) return cfJson({ error: "The draft could not be generated. Try again." }, 422);

    await logUsage(admin, {
      workspace_id: workspaceId, user_id: userId, operation: "draft_reply",
      entity_type: "reply", entity_id: reply.id, status: "success",
    });
    // Returned for review only — nothing is sent from here.
    return cfJson({ ok: true, draft: { subject: parsed.subject, body: parsed.body }, requires_approval: true });
  }

  return cfJson({ error: `Unknown action: ${action}` }, 400);
});
