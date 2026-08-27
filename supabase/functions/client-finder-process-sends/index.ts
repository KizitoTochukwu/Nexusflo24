// Background worker for AI Client Finder outbound sending.
// Invoked by pg_cron. Bounded batch, single-flight lease, idempotent per step.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, cfCors, cfJson } from "../_shared/client-finder.ts";
import {
  bodyToHtml,
  emailDomain,
  isValidEmail,
  randomSpacingSeconds,
  renderTemplate,
  sendIdempotencyKey,
  withinSendingWindow,
} from "../_shared/client-finder-send.ts";

const MAX_ENROLMENTS_PER_RUN = 40;
const LEASE_MINUTES = 5;

type Admin = ReturnType<typeof adminClient>;

async function acquireLease(admin: Admin): Promise<boolean> {
  const now = new Date();
  const { data: existing } = await admin
    .from("prospecting_jobs")
    .select("id, status, next_retry_at")
    .eq("job_type", "send_lease")
    .eq("idempotency_key", "global-send-lease")
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("prospecting_jobs").insert({
      workspace_id: null,
      job_type: "send_lease",
      idempotency_key: "global-send-lease",
      status: "running",
      next_retry_at: new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString(),
    });
    return !error;
  }

  const leaseExpired = !existing.next_retry_at || new Date(existing.next_retry_at) < now;
  if (existing.status === "running" && !leaseExpired) return false;

  const { data: taken } = await admin
    .from("prospecting_jobs")
    .update({ status: "running", next_retry_at: new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString(), started_at: now.toISOString() })
    .eq("id", existing.id)
    .eq("status", existing.status)
    .select("id");
  return (taken ?? []).length > 0;
}

async function releaseLease(admin: Admin, result: Record<string, unknown>) {
  await admin
    .from("prospecting_jobs")
    .update({ status: "idle", result, completed_at: new Date().toISOString(), next_retry_at: null })
    .eq("job_type", "send_lease")
    .eq("idempotency_key", "global-send-lease");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cfCors });

  const admin = adminClient();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("authorization") || "";
  if (!auth.includes(serviceKey)) return cfJson({ error: "Unauthorized" }, 401);

  if (!(await acquireLease(admin))) {
    return cfJson({ ok: true, skipped: "another run holds the lease" });
  }

  const summary = { considered: 0, sent: 0, failed: 0, skipped: 0, completed: 0 };
  const now = new Date();

  try {
    const { data: campaigns } = await admin
      .from("prospecting_campaigns")
      .select("*")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(50);

    for (const campaign of campaigns ?? []) {
      if (!withinSendingWindow(now, campaign.timezone, campaign.send_days, campaign.send_window_start, campaign.send_window_end)) {
        continue;
      }

      // Daily limit is enforced from persisted rows, not memory.
      const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0);
      const { count: sentToday } = await admin
        .from("prospecting_outbound_emails")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .in("status", ["submitted", "sent"])
        .gte("sent_at", dayStart.toISOString());
      let remaining = Math.max(0, (campaign.daily_limit || 50) - (sentToday ?? 0));
      if (remaining === 0) continue;

      const { data: steps } = await admin
        .from("prospecting_sequence_steps")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("step_number");
      if (!steps?.length) continue;

      const [{ data: localSup }, { data: globalSup }] = await Promise.all([
        admin.from("prospecting_suppressions").select("email, domain").eq("workspace_id", campaign.workspace_id),
        admin.from("suppressed_emails").select("email"),
      ]);
      const supEmails = new Set<string>();
      const supDomains = new Set<string>();
      (localSup ?? []).forEach((r: any) => {
        if (r.email) supEmails.add(String(r.email).toLowerCase());
        if (r.domain) supDomains.add(String(r.domain).toLowerCase());
      });
      (globalSup ?? []).forEach((r: any) => r.email && supEmails.add(String(r.email).toLowerCase()));

      const { data: due } = await admin
        .from("prospecting_enrolments")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active")
        .lte("next_send_at", now.toISOString())
        .order("next_send_at", { ascending: true })
        .limit(Math.min(remaining, MAX_ENROLMENTS_PER_RUN));

      for (const enrolment of due ?? []) {
        if (remaining <= 0) break;
        summary.considered++;

        const nextStepNumber = (enrolment.current_step || 0) + 1;
        const step = steps.find((s: any) => s.step_number === nextStepNumber);
        if (!step) {
          await admin.from("prospecting_enrolments")
            .update({ status: "completed", next_send_at: null, stopped_at: now.toISOString(), stop_reason: "sequence finished" })
            .eq("id", enrolment.id);
          summary.completed++;
          continue;
        }

        const { data: contact } = await admin
          .from("prospect_contacts").select("*").eq("id", enrolment.contact_id).maybeSingle();
        const { data: company } = enrolment.company_id
          ? await admin.from("prospect_companies").select("*").eq("id", enrolment.company_id).maybeSingle()
          : { data: null as any };

        const stopEnrolment = async (reason: string) => {
          await admin.from("prospecting_enrolments")
            .update({ status: "stopped", next_send_at: null, stopped_at: now.toISOString(), stop_reason: reason })
            .eq("id", enrolment.id);
          summary.skipped++;
        };

        const email = String(contact?.email ?? "").trim().toLowerCase();
        if (!contact || !isValidEmail(email)) { await stopEnrolment("no valid email address"); continue; }
        if (contact.do_not_contact) { await stopEnrolment("marked do-not-contact"); continue; }
        if (supEmails.has(email) || supDomains.has(emailDomain(email))) { await stopEnrolment("suppressed"); continue; }

        const vars = {
          first_name: contact.first_name || String(contact.full_name || "").split(" ")[0] || "",
          full_name: contact.full_name || "",
          company: company?.name || "",
          job_title: contact.job_title || "",
          industry: company?.industry || "",
          city: company?.city || "",
          country: company?.country || contact.country || "",
          sender_name: campaign.from_name || "",
          booking_url: "",
        };
        const subj = renderTemplate(step.subject_template, vars);
        const bd = renderTemplate(step.body_template, vars);
        const problems = [...subj.missing, ...bd.missing, ...subj.unknown, ...bd.unknown];
        if (problems.length) {
          await stopEnrolment(`unresolved personalisation: ${[...new Set(problems)].join(", ")}`);
          continue;
        }

        const key = sendIdempotencyKey(enrolment.id, step.step_number);
        const { data: created, error: claimErr } = await admin
          .from("prospecting_outbound_emails")
          .insert({
            workspace_id: campaign.workspace_id, campaign_id: campaign.id, enrolment_id: enrolment.id,
            contact_id: contact.id, step_id: step.id, step_number: step.step_number,
            idempotency_key: key, to_email: email, subject: subj.text,
            body_html: bodyToHtml(bd.text), evidence: step.evidence ?? [],
            status: "sending", scheduled_at: enrolment.next_send_at ?? now.toISOString(), attempts: 1,
          })
          .select("id")
          .maybeSingle();

        if (claimErr || !created) {
          // Unique violation means this step was already claimed — never send twice.
          summary.skipped++;
          await admin.from("prospecting_enrolments")
            .update({ current_step: step.step_number, next_send_at: null })
            .eq("id", enrolment.id);
          continue;
        }

        let ok = false;
        let errText: string | null = null;
        let providerId: string | null = null;
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              workspaceId: campaign.workspace_id, to: email,
              subject: subj.text, html: bodyToHtml(bd.text),
            }),
          });
          const data = await res.json().catch(() => ({}));
          ok = res.ok && data?.success !== false;
          providerId = data?.messageId ?? data?.provider_message_id ?? null;
          if (!ok) errText = data?.error || `Email service returned ${res.status}`;
        } catch (e) {
          errText = (e as Error).message;
        }

        // "submitted" — accepted by the email service. Delivery is not claimed here.
        await admin.from("prospecting_outbound_emails")
          .update({
            status: ok ? "submitted" : "failed",
            provider_message_id: providerId,
            error: errText,
            sent_at: ok ? new Date().toISOString() : null,
          })
          .eq("id", created.id);

        if (ok) {
          summary.sent++;
          remaining--;
          const nextStep = steps.find((s: any) => s.step_number === step.step_number + 1);
          const spacing = randomSpacingSeconds(campaign.min_spacing_seconds, campaign.max_spacing_seconds);
          const nextAt = nextStep
            ? new Date(now.getTime() + nextStep.delay_days * 86_400_000 + spacing * 1000).toISOString()
            : null;
          await admin.from("prospecting_enrolments")
            .update({
              current_step: step.step_number,
              next_send_at: nextAt,
              status: nextStep ? "active" : "completed",
              ...(nextStep ? {} : { stopped_at: now.toISOString(), stop_reason: "sequence finished" }),
            })
            .eq("id", enrolment.id);
          if (!nextStep) summary.completed++;
        } else {
          summary.failed++;
          // Retry the same step once more later; the idempotency row keeps the attempt visible.
          const attempts = 1;
          await admin.from("prospecting_enrolments")
            .update({
              next_send_at: new Date(now.getTime() + 60 * 60_000).toISOString(),
              ...(attempts >= 3 ? { status: "stopped", stop_reason: errText?.slice(0, 200) ?? "send failed" } : {}),
            })
            .eq("id", enrolment.id);
        }
      }

      // Auto-pause on a bad failure rate for this campaign.
      const { count: failedCount } = await admin
        .from("prospecting_outbound_emails")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id).eq("status", "failed");
      const { count: totalCount } = await admin
        .from("prospecting_outbound_emails")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      if ((totalCount ?? 0) >= 10 && (failedCount ?? 0) / (totalCount ?? 1) > 0.3) {
        await admin.from("prospecting_campaigns")
          .update({ status: "paused", paused_at: now.toISOString(), paused_reason: "Paused automatically: more than 30% of emails failed." })
          .eq("id", campaign.id);
        await admin.from("prospecting_audit_events").insert({
          workspace_id: campaign.workspace_id, action: "campaign_auto_paused",
          entity_type: "campaign", entity_id: campaign.id,
          detail: { failed: failedCount, total: totalCount },
        });
      }
    }
  } catch (e) {
    console.error("client-finder-process-sends failed", (e as Error).message);
    await releaseLease(admin, { error: (e as Error).message, ...summary });
    return cfJson({ error: (e as Error).message, ...summary }, 500);
  }

  await releaseLease(admin, summary);
  return cfJson({ ok: true, ...summary });
});
