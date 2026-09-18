import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
import { deductCredit } from "../_shared/credit-guard.ts";
import { blocksToHtml, parseBlocksFromMessage, interpolateBlocks } from "../_shared/email-blocks.ts";
import { buildLeadVars, interpolateText } from "../_shared/interpolate-vars.ts";
import { isCredentialError, notifyCredentialFailure } from "../_shared/credential-alert.ts";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";
import { syncTagToContact } from "../_shared/crmTagSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function interpolate(template: string, lead: Record<string, any>): string {
  return interpolateText(template, buildLeadVars(lead as any, { extra: (lead as any).__extra || {} }));
}

/**
 * Loads CRM context for the lead so messages can use {{contact.*}},
 * {{opportunity.reference_number}} and {{assigned_user.name}} tokens.
 * Never throws — messages simply fall back to empty tokens.
 */
async function loadCrmExtras(
  supabase: any,
  workspaceId: string,
  lead: Record<string, any>,
): Promise<Record<string, string>> {
  const extra: Record<string, string> = {};
  let dealOwnerId: string | null = null;
  try {
    // Contact (linked, or matched on email)
    let contact: any = null;
    if (lead.contact_id) {
      const { data } = await supabase.from("contacts").select("*").eq("id", lead.contact_id).maybeSingle();
      contact = data;
    }
    if (!contact && lead.email) {
      const { data } = await supabase
        .from("contacts").select("*")
        .eq("workspace_id", workspaceId).ilike("email", lead.email)
        .maybeSingle();
      contact = data;
    }

    if (contact) {
      extra.contact_id = contact.id;
      for (const key of [
        "first_name", "last_name", "full_name", "email", "phone", "company", "source", "status", "score",
        "job_title", "lifecycle_stage", "temperature", "consent_status", "owner_user_id",
      ]) {
        if (contact[key] != null) extra[key] = String(contact[key]);
      }
      for (const key of ["consent_email", "consent_sms", "consent_whatsapp"]) {
        if (contact[key] != null) extra[key] = contact[key] ? "true" : "false";
      }
      if (contact.whatsapp_number) extra.whatsapp_number = contact.whatsapp_number;
      const { data: vals } = await supabase
        .from("crm_custom_field_values")
        .select("value, crm_custom_field_defs!inner(field_key)")
        .eq("record_id", contact.id);
      for (const row of vals ?? []) {
        const key = (row as any).crm_custom_field_defs?.field_key;
        if (key && row.value != null) extra[String(key)] = String(row.value);
      }

      // Most recent open opportunity for this contact
      const { data: deal } = await supabase
        .from("crm_deals")
        .select("id, name, reference_number, priority, stage_id, pipeline_id, owner_user_id, status, amount, currency, expected_close_date, crm_pipeline_stages(name), crm_pipelines(name)")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contact.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (deal) {
        extra.opportunity_id = deal.id;
        extra.opportunity_name = deal.name || "";
        extra.opportunity_reference_number = deal.reference_number || "";
        extra.opportunity_reference = deal.reference_number || "";
        extra.opportunity_stage = deal.crm_pipeline_stages?.name || "";
        extra.opportunity_pipeline = deal.crm_pipelines?.name || "";
        extra.opportunity_status = deal.status || "";
        extra.opportunity_priority = deal.priority || "";
        extra.opportunity_amount = deal.amount != null ? String(deal.amount) : "";
        extra.opportunity_currency = deal.currency || "";
        extra.opportunity_expected_close_date = deal.expected_close_date || "";
        extra.opportunity_service_required = extra.service_interest || "";
        extra.opportunity_timeframe = extra.service_urgency || "";
        extra.opportunity_preferred_contact = extra.preferred_channel || "";
        extra.opportunity_secure_url = `https://nexusflo24.com/dashboard/${workspaceId}/crm/deals?pipeline=${encodeURIComponent(deal.pipeline_id)}&deal=${encodeURIComponent(deal.id)}`;
        dealOwnerId = deal.owner_user_id || null;
      }
    }

    // Assigned user display name
    const ownerId = dealOwnerId || lead.assigned_owner_id || lead.user_id;
    if (ownerId) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name, email, phone").eq("id", ownerId).maybeSingle();
      if (profile) {
        extra.assigned_rep = profile.full_name || profile.email || "";
        extra.assigned_user_email = profile.email || "";
        extra.assigned_user_phone = profile.phone || "";
      }
    }
  } catch (e) {
    console.error("[execute-automation] loadCrmExtras failed:", String(e));
  }
  return extra;
}

function parseDelayFromConfig(config: Record<string, any>): number {
  // Support structured format: { duration: number, unit: "minutes"|"hours"|"days"|"weeks" }
  const duration = config.duration ?? config.delay_duration ?? config.value;
  const unit = config.unit ?? config.delay_unit;

  if (duration !== undefined && duration !== null && unit) {
    const dur = parseInt(String(duration), 10);
    if (isNaN(dur) || dur <= 0) return 0;
    const u = String(unit).toLowerCase();
    if (u === "minutes" || u === "minute" || u === "min" || u === "m") return dur;
    if (u === "hours" || u === "hour" || u === "hr" || u === "h") return dur * 60;
    if (u === "days" || u === "day" || u === "d") return dur * 1440;
    if (u === "weeks" || u === "week" || u === "w") return dur * 10080;
    return dur; // assume minutes if unit is unrecognized
  }

  // Fallback: legacy string format e.g. "60m", "2h", "1d"
  const delay = config.delay || "";
  const match = delay?.match(/^(\d+)\s*(m|min|h|hr|d|day|w|week)s?$/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const u2 = match[2].toLowerCase();
  if (u2 === "m" || u2 === "min") return value;
  if (u2 === "h" || u2 === "hr") return value * 60;
  if (u2 === "d" || u2 === "day") return value * 1440;
  if (u2 === "w" || u2 === "week") return value * 10080;

  // Fallback: raw number (assume minutes)
  const raw = parseInt(String(config.delay || config.duration), 10);
  if (!isNaN(raw) && raw > 0) return raw;

  return 0;
}

async function sendResend(apiKey: string, from: string, to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Resend error: ${res.status}`);
  return data;
}

async function sendTwilio(sid: string, token: string, from: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Twilio error: ${res.status}`);
  return data;
}

/**
 * Evaluate exit criteria against the lead's current state. Returns the matching
 * criterion type as a string if any are met, or null otherwise.
 */
async function evaluateExitCriteria(
  supabase: any,
  criteria: Array<Record<string, any>>,
  ctx: { workspaceId: string; leadId: string; lead: Record<string, any> }
): Promise<string | null> {
  for (const c of criteria) {
    const type = c?.type;
    if (!type) continue;

    if (type === "purchase_happened") {
      const { count } = await supabase
        .from("lead_activities")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ctx.workspaceId)
        .eq("lead_id", ctx.leadId)
        .eq("type", "purchase");
      if ((count ?? 0) > 0) return type;
    } else if (type === "unsubscribed") {
      // Unsubscribed leads carry the "unsubscribed" tag (set by /unsubscribe handler)
      const tags = (ctx.lead.tags ?? []) as string[];
      if (tags.map((t) => String(t).toLowerCase()).includes("unsubscribed")) return type;
    } else if (type === "appointment_booked") {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ctx.workspaceId)
        .eq("lead_id", ctx.leadId);
      if ((count ?? 0) > 0) return type;
    } else if (type === "tag_added") {
      const target = String(c.tag || "").toLowerCase();
      if (!target) continue;
      const tags = (ctx.lead.tags ?? []) as string[];
      if (tags.map((t) => String(t).toLowerCase()).includes(target)) return type;
    } else if (type === "status_equals") {
      const target = String(c.status || "");
      if (!target) continue;
      if (String(ctx.lead.status || "") === target) return type;
    } else if (type === "deal_stage_reached") {
      // Stops the sequence once the opportunity moves past the early stages
      // (or is closed). With no configured pipeline, inspect every
      // opportunity linked to the lead instead of assuming a pipeline name.
      const pipelineName = String(c.pipeline || "").trim();
      const fromPosition = Number(c.from_position ?? 3);
      let dealQuery = supabase
        .from("crm_deals")
        .select("status, stage_id, crm_pipeline_stages(position)")
        .eq("workspace_id", ctx.workspaceId)
        .eq("lead_id", ctx.leadId);
      if (pipelineName) {
        const { data: pipeline } = await supabase
          .from("crm_pipelines").select("id")
          .eq("workspace_id", ctx.workspaceId).ilike("name", pipelineName).maybeSingle();
        if (!pipeline) continue;
        dealQuery = dealQuery.eq("pipeline_id", pipeline.id);
      }
      const { data: deals } = await dealQuery;
      for (const d of deals ?? []) {
        if (String((d as any).status || "") !== "open") return type;
        const pos = (d as any).crm_pipeline_stages?.position;
        if (typeof pos === "number" && pos >= fromPosition) return type;
      }
    } else if (type === "consent_withdrawn") {
      const { data: contact } = await supabase
        .from("contacts").select("consent_status, consent_email")
        .eq("workspace_id", ctx.workspaceId)
        .ilike("email", ctx.lead.email || "___none___")
        .maybeSingle();
      if (contact && (String(contact.consent_status || "") === "withdrawn" || contact.consent_email === false)) {
        return type;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reqBody = await req.json();
    const { automation_id, lead_id, workspace_id, start_from_step, branch_context: incomingBranchCtx } = reqBody;
    if (!automation_id || !lead_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize caller: internal (service-role) or workspace member
    const authz = await requireInternalOrWorkspaceMember(req, supabase, workspace_id);
    if (authz) {
      const body = await authz.text();
      return new Response(body, {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplication: if this is a fresh trigger (not a scheduled resume),
    // check if there are already pending scheduled jobs for this automation+lead.
    // If so, skip to prevent duplicate emails.
    if (typeof start_from_step !== "number") {
      const { data: existingJobs } = await supabase
        .from("scheduled_jobs")
        .select("id")
        .eq("automation_id", automation_id)
        .eq("lead_id", lead_id)
        .eq("status", "pending")
        .limit(1);

      if (existingJobs && existingJobs.length > 0) {
        console.log(`[execute-automation] Skipping duplicate trigger — pending jobs exist for automation=${automation_id} lead=${lead_id}`);
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Automation already in progress for this lead" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch automation
    const { data: automation, error: autoErr } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automation_id)
      .eq("workspace_id", workspace_id)
      .single();
    if (autoErr || !automation) {
      return new Response(JSON.stringify({ error: "Automation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch steps ordered
    const { data: steps } = await supabase
      .from("automation_steps")
      .select("*")
      .eq("automation_id", automation_id)
      .order("step_order", { ascending: true });

    // Fetch lead
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRM context for {{contact.*}} / {{opportunity.*}} / {{assigned_user.*}} tokens
    (lead as any).__extra = await loadCrmExtras(supabase, workspace_id, lead);
    {
      const bl = (automation.trigger_config as any)?.booking_link;
      if (bl) (lead as any).__extra.booking_link = String(bl);
    }

    // ---------- EXIT CRITERIA RE-CHECK (defense in depth) ----------
    // When resuming from a scheduled step, re-evaluate the automation's exit
    // criteria against the lead's CURRENT state. This catches cases where the
    // lead met the exit signal between the time the job was scheduled and now
    // (e.g. fireTriggers cancellation race, manual data import, etc.).
    if (typeof start_from_step === "number") {
      const exitCriteria = (automation.exit_criteria ?? []) as Array<Record<string, any>>;
      if (Array.isArray(exitCriteria) && exitCriteria.length > 0) {
        const exitHit = await evaluateExitCriteria(supabase, exitCriteria, {
          workspaceId: workspace_id,
          leadId: lead_id,
          lead,
        });
        if (exitHit) {
          console.log(`[execute-automation] Exit criteria matched (${exitHit}) — aborting resume for automation=${automation_id} lead=${lead_id}`);
          await supabase.from("automation_logs").insert({
            automation_id,
            workspace_id,
            lead_id,
            event_type: `exit_criteria:${exitHit}`,
            status: "cancelled",
            details: { reason: "Exit criteria met on resume", criterion: exitHit, step_index: start_from_step },
          } as any);
          return new Response(JSON.stringify({ ok: true, exited: true, reason: exitHit }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Credits are charged here once per messaging step; the downstream send
    // functions receive skipCredits so the same message is never charged twice.
    // Workspaces flagged "unlimited" are exempted inside the credit ledger.

    const results: any[] = [];
    let skipRemaining = false;
    const startIndex = typeof start_from_step === "number" ? start_from_step : 0;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let lastSendTime = 0;

    // ---------- BRANCHING STATE ----------
    // Conditions can be followed by `branch_yes_start` / `branch_no_start` markers.
    // Steps inside an inactive branch are skipped. Branch state is preserved
    // across delay-resumes via scheduled_jobs.payload.branch_context.
    type BranchFrame = { kind: "yes" | "no"; skip: boolean };
    let lastConditionPassed: boolean | null = null;
    // True when the preceding condition step could not be evaluated (not finished
    // in the builder). Neither branch runs; the automation continues below them.
    let lastConditionUnconfigured = false;
    let branchStack: BranchFrame[] = [];

    // Restore branch context if resuming from a scheduled job
    if (incomingBranchCtx) {
      try {
        if (Array.isArray(incomingBranchCtx.branch_stack)) branchStack = incomingBranchCtx.branch_stack;
        if (typeof incomingBranchCtx.last_condition_passed === "boolean" || incomingBranchCtx.last_condition_passed === null) {
          lastConditionPassed = incomingBranchCtx.last_condition_passed;
        }
      } catch (_e) { /* noop */ }
    }

    const isInInactiveBranch = () => branchStack.some((f) => f.skip);

    for (let i = startIndex; i < (steps || []).length; i++) {
      const step = steps![i];

      // Branch markers — handled before skip checks so end-markers can pop frames
      if (step.step_type === "branch_yes_start" || step.step_type === "branch_no_start") {
        const kind: "yes" | "no" = step.step_type === "branch_yes_start" ? "yes" : "no";
        const shouldSkip = lastConditionPassed === null
          ? false // no preceding condition → run by default
          : (kind === "yes" ? lastConditionPassed === false : lastConditionPassed === true);
        // Nested skip: inherit parent skip too
        const parentSkipped = isInInactiveBranch();
        const finalSkip = shouldSkip || parentSkipped;
        branchStack.push({ kind, skip: finalSkip });
        const markerStatus = finalSkip ? "branch_skipped" : "branch_entered";
        const markerDetails = {
          kind,
          last_condition_passed: lastConditionPassed,
          reason: parentSkipped
            ? "Parent branch was inactive"
            : finalSkip
              ? `Preceding condition was ${lastConditionPassed ? "true" : "false"}, so the ${kind.toUpperCase()} branch was not taken`
              : `Preceding condition was ${lastConditionPassed === null ? "absent (default entry)" : lastConditionPassed ? "true" : "false"}, entering the ${kind.toUpperCase()} branch`,
        };
        results.push({ step_id: step.id, step_type: step.step_type, status: markerStatus, details: markerDetails });
        await supabase.from("automation_logs").insert({
          automation_id, workspace_id, lead_id,
          event_type: `branch:${kind}_start`,
          status: markerStatus,
          details: markerDetails,
        });
        continue;
      }
      if (step.step_type === "branch_yes_end" || step.step_type === "branch_no_end") {
        const kind: "yes" | "no" = step.step_type === "branch_yes_end" ? "yes" : "no";
        // Pop the most recent frame of matching kind
        let poppedSkip: boolean | null = null;
        for (let k = branchStack.length - 1; k >= 0; k--) {
          if (branchStack[k].kind === kind) {
            poppedSkip = branchStack[k].skip;
            branchStack.splice(k, 1);
            break;
          }
        }
        const endDetails = { kind, was_skipped: poppedSkip === true };
        results.push({ step_id: step.id, step_type: step.step_type, status: "branch_exited", details: endDetails });
        await supabase.from("automation_logs").insert({
          automation_id, workspace_id, lead_id,
          event_type: `branch:${kind}_end`,
          status: "branch_exited",
          details: endDetails,
        });
        continue;
      }

      if (skipRemaining) {
        const skipDetails = { reason: "Skipped due to earlier condition or delay" };
        results.push({ step_id: step.id, step_type: step.step_type, status: "skipped", details: skipDetails });
        await supabase.from("automation_logs").insert({
          automation_id, workspace_id, lead_id,
          event_type: `${step.step_type}:skipped`,
          status: "skipped",
          details: skipDetails,
        });
        continue;
      }

      if (isInInactiveBranch()) {
        // Surface which branch kind suppressed the step so the timeline UI
        // can render it under the correct YES/NO group with a "skipped" tone.
        const activeFrame = branchStack[branchStack.length - 1];
        const skipDetails = {
          reason: "Inside inactive YES/NO branch",
          branch_kind: activeFrame?.kind ?? null,
        };
        results.push({ step_id: step.id, step_type: step.step_type, status: "branch_skipped", details: skipDetails });
        await supabase.from("automation_logs").insert({
          automation_id, workspace_id, lead_id,
          event_type: `${step.step_type}:branch_skipped`,
          status: "branch_skipped",
          details: skipDetails,
        });
        continue;
      }

      const config = (step.config || {}) as Record<string, any>;
      let status = "success";
      let details: any = {};

      try {
        switch (step.step_type) {
          case "action": {
            let actionType = config.action || config.action_type || config.channel;

            // "Send on the contact's preferred channel" resolves to a concrete
            // channel here; WhatsApp needs a number, otherwise we fall back to email.
            if (actionType === "send_preferred_channel") {
              const extras = ((lead as any).__extra || {}) as Record<string, string>;
              const pref = String(extras.preferred_channel || config.default_channel || "email").toLowerCase();
              const waNumber = extras.whatsapp_number || lead.phone;
              if (pref.includes("whatsapp") && waNumber) actionType = "send_whatsapp";
              else if (pref.includes("sms") && lead.phone) actionType = "send_sms";
              else actionType = "send_email";
              details.resolved_channel = actionType;
            }


            // Rate-limit: wait at least 550ms between sends to stay under 2 req/s
            if (["send_email", "send_sms", "send_whatsapp"].includes(actionType)) {
              const elapsed = Date.now() - lastSendTime;
              if (lastSendTime > 0 && elapsed < 550) {
                await sleep(550 - elapsed);
              }

              // Credit deduction (unlimited workspaces are exempted in the ledger)
              {
                const creditChannel = actionType === "send_email" ? "email" : actionType === "send_sms" ? "sms" : "whatsapp";
                const creditResult = await deductCredit(workspace_id, creditChannel as any, `automation:${automation_id}`);
                if (!creditResult.allowed) {
                  // Mark this step as insufficient_credits so the UI can surface a friendly
                  // "Top up credits" CTA instead of a generic red error.
                  status = "insufficient_credits";
                  details = {
                    channel: creditChannel,
                    remaining: creditResult.remaining ?? 0,
                    error: creditResult.error || `Insufficient ${creditChannel} credits`,
                    message: `Out of ${creditChannel} credits — top up in Settings → Usage to resume.`,
                  };
                  // Skip the actual send for this step but DO NOT halt the whole sequence;
                  // the next step (e.g. another channel or a delay) should still run.
                  break;
                }
              }
            }

            if (actionType === "send_email") {
              const apiKey = Deno.env.get("RESEND_API_KEY");
              const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
              if (!apiKey) {
                status = "skipped";
                details = { reason: "Email provider not configured", channel: "email", channel_unavailable: true };
                break;
              }
              if (!lead.email) {
                status = "skipped";
                details = { reason: "Lead has no email — channel skipped", channel: "email", channel_unavailable: true };
                break;
              }
              // Skip if lead is unsubscribed
              if ((lead.tags || []).includes("unsubscribed")) {
                details = { message: "Lead is unsubscribed", channel: "email" };
                status = "skipped";
                break;
              }
              const subject = interpolate(config.subject || "Hello", lead);
              const rawBody = String(config.body || config.message || "");
              const blocks = parseBlocksFromMessage(rawBody);
              let renderedBody: string;
              if (blocks) {
                const interpolated = interpolateBlocks(blocks, (s) => interpolate(s, lead));
                renderedBody = blocksToHtml(interpolated);
              } else {
                renderedBody = formatEmailBody(interpolate(rawBody, lead));
              }
              const appBaseUrl = "https://nexusflo24.lovable.app";
              const unsubUrl = `${appBaseUrl}/unsubscribe?lid=${lead_id}&wid=${workspace_id}`;
              const ts = config.templateSettings as Record<string, any> | undefined;
              let html = wrapEmailTemplate(renderedBody, {
                ...(ts || {}),
                unsubUrl,
                interpolate: (s: string) => interpolate(s, lead),
              });
              const senderProfileId = (config as any).sender_profile_id || null;
              try {
                if (senderProfileId) {
                  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ workspaceId: workspace_id, to: lead.email, subject, html, leadId: lead_id, skipCredits: true, senderProfileId }),
                  });
                  const d = await r.json().catch(() => ({}));
                  lastSendTime = Date.now();
                  details = { messageId: d?.id || d?.messageId, channel: "email", senderProfileId };
                } else {
                  const res = await sendResend(apiKey, `NexusFlo24 <${fromEmail}>`, lead.email, subject, html, "NexusFlo24 Support <support@nexusflo24.com>");
                  lastSendTime = Date.now();
                  details = { messageId: res.id, channel: "email" };
                }
              } catch (sendErr: any) {
                const msg = String(sendErr?.message || "Email send failed");
                const isAuth = isCredentialError("email", msg);
                status = "error";
                details = { error: msg, channel: "email", provider_auth_error: isAuth };
                if (isAuth) {
                  // Deduped workspace-level alert (once per 6h per channel)
                  await notifyCredentialFailure({
                    workspaceId: workspace_id,
                    channel: "email",
                    errorMessage: msg,
                    meta: { provider: "resend", source: "execute-automation", automation_id, lead_id },
                  });
                }
                // Do NOT throw — let the chain continue to the next step
              }
            } else if (actionType === "send_sms") {
              const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
              const token = Deno.env.get("TWILIO_AUTH_TOKEN");
              const from = Deno.env.get("TWILIO_FROM_NUMBER");
              if (!sid || !token || !from) {
                status = "skipped";
                details = { reason: "SMS provider not configured", channel: "sms", channel_unavailable: true };
                break;
              }
              if (!lead.phone) {
                status = "skipped";
                details = { reason: "Lead has no phone — channel skipped", channel: "sms", channel_unavailable: true };
                break;
              }
              const body = interpolate(config.message || "", lead);
              const smsSenderProfileId = (config as any).sender_profile_id || null;
              try {
                if (smsSenderProfileId) {
                  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ workspaceId: workspace_id, to: lead.phone, message: body, leadId: lead_id, skipCredits: true, senderProfileId: smsSenderProfileId }),
                  });
                  const d = await r.json().catch(() => ({}));
                  lastSendTime = Date.now();
                  details = { sid: d?.sid, channel: "sms", senderProfileId: smsSenderProfileId };
                } else {
                  const res = await sendTwilio(sid, token, from, lead.phone, body);
                  lastSendTime = Date.now();
                  details = { sid: res.sid, channel: "sms" };
                }
              } catch (sendErr: any) {
                const msg = String(sendErr?.message || "SMS send failed");
                const isAuth = isCredentialError("sms", msg);
                status = "error";
                details = { error: msg, channel: "sms", provider_auth_error: isAuth };
                if (isAuth) {
                  await notifyCredentialFailure({
                    workspaceId: workspace_id,
                    channel: "sms",
                    errorMessage: msg,
                    meta: { provider: "twilio", source: "execute-automation", automation_id, lead_id },
                  });
                }
                // Do NOT throw and do NOT set skipRemaining — chain must continue.
              }
            } else if (actionType === "send_whatsapp") {
              if (!lead.phone) {
                status = "skipped";
                details = { reason: "Lead has no phone — channel skipped", channel: "whatsapp", channel_unavailable: true };
                break;
              }
              const body = interpolate(config.message || "", lead);
              // Interpolate WhatsApp template variables per-lead so
              // "{{first_name}}" in variable mapping renders as "John".
              const waTpl = (config as any).whatsapp_template as
                | { id?: string; name?: string; language?: string; contentSid?: string; contentVariables?: Record<string, string>; headerMediaUrl?: string }
                | undefined;
              const templatePayload = waTpl && (waTpl.contentSid || waTpl.id)
                ? {
                    id: waTpl.id,
                    name: waTpl.name,
                    language: waTpl.language,
                    contentSid: waTpl.contentSid,
                    contentVariables: Object.fromEntries(
                      Object.entries(waTpl.contentVariables || {}).map(([k, v]) => [k, interpolate(String(v ?? ""), lead)]),
                    ),
                    ...(waTpl.headerMediaUrl ? { headerMediaUrl: waTpl.headerMediaUrl } : {}),
                  }
                : undefined;
              let waRes: Response;
              let waData: any = {};
              try {
                waRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    workspaceId: workspace_id,
                    to: lead.phone,
                    body,
                    leadId: lead_id,
                    skipCredits: true,
                    senderProfileId: (config as any).sender_profile_id || null,
                    ...(templatePayload ? { template: templatePayload } : {}),
                  }),
                });
                waData = await waRes.json().catch(() => ({}));
              } catch (sendErr: any) {
                const msg = String(sendErr?.message || "WhatsApp send failed");
                const isAuth = isCredentialError("whatsapp", msg);
                status = "error";
                details = { error: msg, channel: "whatsapp", provider_auth_error: isAuth };
                if (isAuth) {
                  await notifyCredentialFailure({
                    workspaceId: workspace_id,
                    channel: "whatsapp",
                    errorMessage: msg,
                    meta: { provider: "whatsapp_cloud", source: "execute-automation", automation_id, lead_id },
                  });
                }
                // Do NOT throw and do NOT set skipRemaining — chain must continue.
                break;
              }
              // Auto-fallback: when whatsapp-send flags fallback:true and the
              // step config declares fallback_channel (sms|email), fire the
              // sibling channel inline. Matches HubSpot / GHL workflow steps.
              const wantsFallback = waData?.fallback === true;
              const fbChannel = String((config as any).fallback_channel || "").toLowerCase();
              if (wantsFallback && (fbChannel === "sms" || fbChannel === "email")) {
                const fbMessage = interpolate(String((config as any).fallback_message || config.message || ""), lead);
                if (fbChannel === "sms" && lead.phone) {
                  const fbRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ workspaceId: workspace_id, to: lead.phone, message: fbMessage, leadId: lead_id, skipCredits: true }),
                  });
                  const fbData = await fbRes.json().catch(() => ({}));
                  status = fbRes.ok && fbData?.success !== false ? "success" : "error";
                  details = { primary_channel: "whatsapp", fallback_channel: "sms", fallback_reason: waData?.reason, error: fbData?.error };
                  break;
                }
                if (fbChannel === "email" && lead.email) {
                  const fbRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      workspaceId: workspace_id, to: lead.email,
                      subject: String((config as any).fallback_subject || (config as any).subject || "Follow-up"),
                      html: fbMessage, leadId: lead_id, skipCredits: true,
                    }),
                  });
                  const fbData = await fbRes.json().catch(() => ({}));
                  status = fbRes.ok && fbData?.success !== false ? "success" : "error";
                  details = { primary_channel: "whatsapp", fallback_channel: "email", fallback_reason: waData?.reason, error: fbData?.error };
                  break;
                }
              }
              // Soft-handle 24h window closed → mark as skipped (per core rule), don't kill chain
              if (waData?.fallback === true || /24h\s*window/i.test(String(waData?.error || ""))) {
                status = "skipped";
                details = {
                  reason: "WhatsApp 24h window closed — send an approved template or wait for a reply",
                  channel: "whatsapp",
                  wa_window_closed: true,
                };
                break;
              }
              if (!waRes.ok || !waData.success) {
                status = "error";
                details = { error: waData?.error || "WhatsApp send failed", channel: "whatsapp" };
                break;
              }
              lastSendTime = Date.now();
              details = { waMessageId: waData.waMessageId, channel: "whatsapp", credentialSource: waData.credentialSource };
            } else if (actionType === "add_tag") {
              const tag = config.tag;
              if (tag) {
                await supabase
                  .from("leads")
                  .update({ tags: [...(lead.tags || []).filter((t: string) => t !== tag), tag] })
                  .eq("id", lead_id);
                await syncTagToContact(supabase, {
                  workspaceId: automation.workspace_id,
                  leadId: lead_id,
                  contactId: (lead as any).contact_id ?? null,
                  tag,
                  mode: "add",
                });
                details = { tag, action: "added" };
              }
            } else if (actionType === "remove_tag") {
              const tag = config.tag;
              if (tag) {
                await supabase
                  .from("leads")
                  .update({ tags: (lead.tags || []).filter((t: string) => t !== tag) })
                  .eq("id", lead_id);
                await syncTagToContact(supabase, {
                  workspaceId: automation.workspace_id,
                  leadId: lead_id,
                  contactId: (lead as any).contact_id ?? null,
                  tag,
                  mode: "remove",
                });
                details = { tag, action: "removed" };
              }
            } else if (actionType === "update_status") {
              const newStatus = config.new_status || config.status;
              if (newStatus) {
                await supabase.from("leads").update({ status: newStatus }).eq("id", lead_id);
                details = { newStatus };
              }
            } else if (actionType === "notify_sales") {
              // ---- Notify Sales v2: multi-recipient + multi-channel fan-out ----
              const title = interpolate(config.title || "Automation Alert", lead);
              const body = interpolate(
                config.message || `Lead ${lead.full_name || lead.email} requires attention.`,
                lead,
              );

              // Resolve recipient set (default = lead owner + automation creator).
              const recipientKinds: string[] = Array.isArray(config.recipients) && config.recipients.length
                ? config.recipients
                : ["lead_owner", "creator"];
              const channels: string[] = Array.isArray(config.channels) && config.channels.length
                ? config.channels
                : ["inapp", "email"];

              const recipientUserIds = new Set<string>();
              if (recipientKinds.includes("lead_owner")) {
                const ownerId = (lead as any).assigned_owner_id || (lead as any).user_id;
                if (ownerId) recipientUserIds.add(ownerId);
              }
              if (recipientKinds.includes("creator") && automation.user_id) {
                recipientUserIds.add(automation.user_id);
              }
              if (recipientKinds.includes("specific") && Array.isArray(config.recipient_user_ids)) {
                for (const uid of config.recipient_user_ids) if (uid) recipientUserIds.add(String(uid));
              }
              if (recipientKinds.includes("all_admins") || recipientKinds.includes("all_members")) {
                const { data: members } = await supabase
                  .from("workspace_members")
                  .select("user_id, role")
                  .eq("workspace_id", workspace_id);
                for (const m of members || []) {
                  if (recipientKinds.includes("all_members")) recipientUserIds.add(m.user_id);
                  else if (["owner", "admin"].includes(m.role)) recipientUserIds.add(m.user_id);
                }
              }

              const deliveries: Record<string, any> = { inapp: 0, email: 0, sms: 0, whatsapp: 0, skipped: [] as any[] };

              if (recipientUserIds.size === 0) {
                status = "skipped";
                details = { reason: "no_recipients_resolved", recipientKinds };
                break;
              }

              // Fetch profile contact info in one go for email/sms/whatsapp delivery.
              const ids = Array.from(recipientUserIds);
              const { data: profiles } = await supabase
                .from("profiles")
                .select("id, email, full_name, phone")
                .in("id", ids);
              const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

              for (const uid of ids) {
                const prof = profileMap.get(uid);

                // 1) In-app — always (mirrors original behaviour, but per recipient).
                if (channels.includes("inapp")) {
                  await supabase.from("notifications").insert({
                    workspace_id,
                    user_id: uid,
                    title,
                    body,
                    type: "automation_alert",
                    meta: { lead_id, automation_id },
                  });
                  deliveries.inapp++;
                }

                // 2) Email
                if (channels.includes("email")) {
                  const to = prof?.email;
                  if (!to) {
                    deliveries.skipped.push({ uid, channel: "email", reason: "no_profile_email" });
                  } else {
                    try {
                      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                        },
                        body: JSON.stringify({
                          workspaceId: workspace_id,
                          to,
                          subject: title,
                          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
                          leadId: lead_id,
                          skipCredits: true,
                          isInternal: true,
                        }),
                      });
                      deliveries.email++;
                    } catch (e: any) {
                      deliveries.skipped.push({ uid, channel: "email", reason: e?.message || "send_failed" });
                    }
                  }
                }

                // 3) SMS
                if (channels.includes("sms")) {
                  const to = prof?.phone;
                  if (!to) {
                    deliveries.skipped.push({ uid, channel: "sms", reason: "no_profile_phone" });
                  } else {
                    try {
                      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                        },
                        body: JSON.stringify({
                          workspaceId: workspace_id,
                          to,
                          message: `${title}\n${body}`,
                          skipCredits: true,
                          isInternal: true,
                        }),
                      });
                      deliveries.sms++;
                    } catch (e: any) {
                      deliveries.skipped.push({ uid, channel: "sms", reason: e?.message || "send_failed" });
                    }
                  }
                }

                // 4) WhatsApp (24h window rules already enforced by whatsapp-send)
                if (channels.includes("whatsapp")) {
                  const to = prof?.phone;
                  if (!to) {
                    deliveries.skipped.push({ uid, channel: "whatsapp", reason: "no_profile_phone" });
                  } else {
                    try {
                      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                        },
                        body: JSON.stringify({
                          workspaceId: workspace_id,
                          to,
                          body: `*${title}*\n${body}`,
                          skipCredits: true,
                          isInternal: true,
                        }),
                      });
                      const d = await r.json().catch(() => ({}));
                      if (d?.fallback === true || d?.success === false) {
                        deliveries.skipped.push({ uid, channel: "whatsapp", reason: "wa_window_or_error" });
                      } else {
                        deliveries.whatsapp++;
                      }
                    } catch (e: any) {
                      deliveries.skipped.push({ uid, channel: "whatsapp", reason: e?.message || "send_failed" });
                    }
                  }
                }
              }

              details = { recipients: ids.length, deliveries };
            } else if (actionType === "adjust_score") {
              const delta = parseInt(String(config.score_delta ?? config.delta ?? 0), 10) || 0;
              const previous = Number(lead.score || 0);
              const newScore = Math.max(0, previous + delta);
              await supabase.from("leads").update({ score: newScore }).eq("id", lead_id);
              await supabase.from("lead_score_history").insert({
                workspace_id,
                lead_id,
                delta,
                previous_score: previous,
                new_score: newScore,
                source: "automation",
                ref_type: "automation",
                ref_id: automation_id,
                reason: `Automation adjusted score by ${delta > 0 ? "+" : ""}${delta}`,
              });
              details = { delta, previous, newScore };
            } else if (actionType === "enroll_in_automation") {
              const targetId = String(config.target_automation_id || config.automation_id || "").trim();
              if (!targetId) {
                status = "skipped";
                details = { message: "No target automation selected" };
                break;
              }
              if (targetId === automation_id) {
                status = "skipped";
                details = { message: "Cannot enroll lead in the same automation (would loop)" };
                break;
              }
              // Verify target exists and belongs to same workspace
              const { data: target } = await supabase
                .from("automations")
                .select("id, status, workspace_id")
                .eq("id", targetId)
                .eq("workspace_id", workspace_id)
                .maybeSingle();
              if (!target) {
                status = "error";
                details = { error: "Target automation not found in this workspace" };
                break;
              }
              if (target.status !== "active") {
                status = "skipped";
                details = { message: "Target automation is not active", target_id: targetId };
                break;
              }
              // Fire-and-forget enrollment
              try {
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-automation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    automation_id: targetId,
                    lead_id,
                    workspace_id,
                  }),
                });
                details = { enrolled_in: targetId };
              } catch (e: any) {
                status = "error";
                details = { error: e?.message || "Enrollment dispatch failed" };
              }
            } else if (actionType === "assign_owner") {
              const mode = String(config.assign_mode || "round_robin");
              let assignedUserId: string | null = null;
              if (mode === "specific") {
                const targetUid = String(config.assign_user_id || "").trim();
                if (!targetUid) {
                  status = "skipped";
                  details = { message: "No user selected for assign_owner" };
                  break;
                }
                // Verify target user belongs to workspace
                const { data: member } = await supabase
                  .from("workspace_members")
                  .select("user_id")
                  .eq("workspace_id", workspace_id)
                  .eq("user_id", targetUid)
                  .maybeSingle();
                if (!member) {
                  status = "error";
                  details = { error: "Selected user is not a member of this workspace" };
                  break;
                }
                assignedUserId = targetUid;
              } else {
                // round_robin via DB function
                const { data: rr, error: rrErr } = await supabase.rpc("assign_next_round_robin", {
                  _workspace_id: workspace_id,
                });
                if (rrErr) {
                  status = "error";
                  details = { error: rrErr.message || "Round-robin assignment failed" };
                  break;
                }
                assignedUserId = (rr as string | null) || null;
              }
              if (!assignedUserId) {
                status = "skipped";
                details = { message: "No eligible user available for assignment" };
                break;
              }
              const previousOwnerId = (lead as any).assigned_owner_id || null;
              await supabase.from("leads").update({ assigned_owner_id: assignedUserId }).eq("id", lead_id);
              await supabase.from("lead_activities").insert({
                lead_id,
                workspace_id,
                user_id: automation.user_id,
                type: "owner_assigned",
                meta: { assigned_to: assignedUserId, mode, automation_id, previous_owner_id: previousOwnerId },
              });

              // ---- Notify the new owner (Assign Owner v2) ----
              const notifyNewOwner = config.notify_new_owner !== false;
              const isReassignNoop = previousOwnerId && previousOwnerId === assignedUserId;
              const notifyDeliveries: Record<string, any> = { inapp: 0, email: 0, sms: 0, whatsapp: 0, skipped: [] as any[] };

              if (notifyNewOwner && !isReassignNoop) {
                const channels: string[] = Array.isArray(config.channels) && config.channels.length
                  ? config.channels
                  : ["inapp", "email"];
                const alsoNotify: string[] = Array.isArray(config.also_notify) ? config.also_notify : [];

                const recipientIds = new Set<string>([assignedUserId]);
                if (alsoNotify.includes("creator") && automation.user_id) recipientIds.add(automation.user_id);
                if (alsoNotify.includes("previous_owner") && previousOwnerId) recipientIds.add(previousOwnerId);
                if (alsoNotify.includes("all_admins")) {
                  const { data: members } = await supabase
                    .from("workspace_members").select("user_id, role").eq("workspace_id", workspace_id);
                  for (const m of members || []) {
                    if (["owner", "admin"].includes(m.role)) recipientIds.add(m.user_id);
                  }
                }

                const ids = Array.from(recipientIds);
                const { data: profiles } = await supabase
                  .from("profiles").select("id, email, full_name, phone").in("id", ids);
                const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

                const titleTpl = config.notify_title || "New lead assigned to you";
                const msgTpl = config.notify_message
                  || "{{lead.full_name}} ({{lead.email}}) was just assigned to you.";
                const title = interpolate(String(titleTpl), lead);
                const body = interpolate(String(msgTpl), lead);

                for (const uid of ids) {
                  const prof = profileMap.get(uid);
                  if (channels.includes("inapp")) {
                    await supabase.from("notifications").insert({
                      workspace_id, user_id: uid, title, body,
                      type: "lead_assigned",
                      meta: { lead_id, automation_id, assigned_to: assignedUserId, previous_owner_id: previousOwnerId },
                    });
                    notifyDeliveries.inapp++;
                  }
                  if (channels.includes("email") && prof?.email) {
                    try {
                      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                        body: JSON.stringify({
                          workspaceId: workspace_id, to: prof.email, subject: title,
                          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
                          leadId: lead_id, skipCredits: true, isInternal: true,
                        }),
                      });
                      notifyDeliveries.email++;
                    } catch (e: any) { notifyDeliveries.skipped.push({ uid, channel: "email", reason: e?.message }); }
                  } else if (channels.includes("email")) {
                    notifyDeliveries.skipped.push({ uid, channel: "email", reason: "no_profile_email" });
                  }
                  if (channels.includes("sms") && prof?.phone) {
                    try {
                      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                        body: JSON.stringify({
                          workspaceId: workspace_id, to: prof.phone, message: `${title}\n${body}`,
                          skipCredits: true, isInternal: true,
                        }),
                      });
                      notifyDeliveries.sms++;
                    } catch (e: any) { notifyDeliveries.skipped.push({ uid, channel: "sms", reason: e?.message }); }
                  } else if (channels.includes("sms")) {
                    notifyDeliveries.skipped.push({ uid, channel: "sms", reason: "no_profile_phone" });
                  }
                  if (channels.includes("whatsapp") && prof?.phone) {
                    try {
                      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                        body: JSON.stringify({
                          workspaceId: workspace_id, to: prof.phone, body: `*${title}*\n${body}`,
                          skipCredits: true, isInternal: true,
                        }),
                      });
                      const d = await r.json().catch(() => ({}));
                      if (d?.fallback === true || d?.success === false) {
                        notifyDeliveries.skipped.push({ uid, channel: "whatsapp", reason: "wa_window_or_error" });
                      } else { notifyDeliveries.whatsapp++; }
                    } catch (e: any) { notifyDeliveries.skipped.push({ uid, channel: "whatsapp", reason: e?.message }); }
                  } else if (channels.includes("whatsapp")) {
                    notifyDeliveries.skipped.push({ uid, channel: "whatsapp", reason: "no_profile_phone" });
                  }
                }
              }

              details = {
                assigned_to: assignedUserId,
                mode,
                previous_owner_id: previousOwnerId,
                notified: notifyNewOwner && !isReassignNoop,
                ...(notifyNewOwner && !isReassignNoop ? { deliveries: notifyDeliveries } : {}),
                ...(isReassignNoop ? { reassign_noop: true } : {}),
              };
            } else if (actionType === "create_task") {
              const extras = ((lead as any).__extra || {}) as Record<string, string>;
              const dueMinutes = Number(config.due_in_minutes ?? config.due_minutes ?? 1440);
              const assignee = config.assigned_to || lead.assigned_owner_id || automation.user_id;
              const dedupeKey = `automation:${automation_id}:${step.id}:${lead_id}`;
              const { data: existingTask } = await supabase
                .from("crm_tasks").select("id")
                .eq("workspace_id", workspace_id).eq("dedupe_key", dedupeKey)
                .maybeSingle();
              if (existingTask) {
                status = "skipped";
                details = { reason: "Task already created for this lead", task_id: existingTask.id };
              } else {
                const { data: task, error: taskErr } = await supabase
                  .from("crm_tasks").insert({
                    workspace_id,
                    title: interpolate(config.title || "Follow up on this enquiry", lead),
                    description: interpolate(config.description || "", lead) || null,
                    due_date: new Date(Date.now() + (isNaN(dueMinutes) ? 1440 : dueMinutes) * 60000).toISOString(),
                    priority: config.priority || "medium",
                    status: "open",
                    task_type: config.task_type || "follow_up",
                    assigned_to: assignee || null,
                    created_by: automation.user_id || null,
                    lead_id,
                    contact_id: extras.contact_id || null,
                    deal_id: extras.opportunity_id || null,
                    dedupe_key: dedupeKey,
                  })
                  .select("id").maybeSingle();
                if (taskErr) { status = "error"; details = { error: taskErr.message }; }
                else details = { task_id: task?.id, assigned_to: assignee };
              }
            } else if (actionType === "add_note") {
              const extras = ((lead as any).__extra || {}) as Record<string, string>;
              const body = interpolate(config.body || config.note || "", lead);
              const recordType = extras.contact_id ? "contact" : "lead";
              const recordId = extras.contact_id || lead_id;
              if (!body) { status = "skipped"; details = { reason: "Empty note body" }; }
              else {
                const { error: noteErr } = await supabase.from("crm_notes").insert({
                  workspace_id, record_type: recordType, record_id: recordId,
                  body, author_user_id: automation.user_id || null,
                });
                if (noteErr) { status = "error"; details = { error: noteErr.message }; }
                else {
                  await supabase.from("crm_activities").insert({
                    workspace_id, record_type: recordType, record_id: recordId,
                    activity_type: "note_added",
                    title: config.title || "Enquiry details",
                    description: body.slice(0, 500),
                    source: "automation",
                    lead_id,
                  });
                  details = { record_type: recordType, record_id: recordId };
                }
              }
            } else if (actionType === "update_deal_stage" || actionType === "set_deal_priority") {
              const extras = ((lead as any).__extra || {}) as Record<string, string>;
              const dealId = extras.opportunity_id;
              if (!dealId) { status = "skipped"; details = { reason: "No open opportunity for this contact" }; }
              else {
                const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (config.priority) patch.priority = config.priority;
                if (config.stage) {
                  const { data: pipeline } = await supabase
                    .from("crm_pipelines").select("id")
                    .eq("workspace_id", workspace_id)
                    .ilike("name", config.pipeline || "afarhome enquiries")
                    .maybeSingle();
                  if (pipeline) {
                    const { data: stage } = await supabase
                      .from("crm_pipeline_stages").select("id")
                      .eq("pipeline_id", pipeline.id).ilike("name", String(config.stage))
                      .maybeSingle();
                    if (stage) patch.stage_id = stage.id;
                  }
                }
                if (config.owner_user_id) patch.owner_user_id = config.owner_user_id;
                const { error: dealErr } = await supabase.from("crm_deals").update(patch).eq("id", dealId);
                if (dealErr) { status = "error"; details = { error: dealErr.message }; }
                else details = { deal_id: dealId, ...patch };
              }
            } else if (actionType === "end_automation") {
              skipRemaining = true;
              details = { message: "Automation ended by End Automation action", reason: config.reason || null };
            } else {
              details = { message: `Unknown action type: ${actionType}` };
              status = "skipped";
            }
            break;
          }

          case "condition": {
            type Row = {
              condition?: string;
              operator?: string;
              value?: unknown;
              value_to?: unknown;
              time_window_days?: number | string;
              reply_check?: string;
              field?: string;
            };

            // Build the list of rows to evaluate. Prefer new `conditions[]` shape;
            // otherwise fall back to the legacy single-row config fields.
            const rawRows = Array.isArray((config as any).conditions)
              ? ((config as any).conditions as Row[]).filter((r) => r && r.condition)
              : [];
            const rows: Row[] = rawRows.length
              ? rawRows
              : config.condition || config.field
              ? [{
                  condition: (config.condition as string) || (config.field as string),
                  operator: config.operator as string | undefined,
                  value: config.value,
                  value_to: config.value_to,
                  time_window_days: config.time_window_days as number | undefined,
                  reply_check: config.reply_check as string | undefined,
                  field: config.field as string | undefined,
                }]
              : [];
            const logic = (((config as any).logic as string) || "AND").toUpperCase() === "OR" ? "OR" : "AND";

            // A row is only usable when it has everything it needs. Half-finished rows
            // must NOT be treated as "false" (that used to silently push everyone down
            // the NO branch) — the whole step is skipped instead.
            const NO_VALUE_OPS = ["is_known", "is_unknown", "happened", "not_happened", "is_true", "is_false"];
            const rowIsUsable = (r: Row): boolean => {
              if (!r?.condition) return false;
              if (r.condition === "reply_status") return true;
              if (r.condition === "contact_field" && !r.field) return false;
              const op = String(r.operator || "");
              if (NO_VALUE_OPS.includes(op)) return true;
              const v = r.value;
              if (v === undefined || v === null || String(v).trim() === "") return false;
              if (op === "between" && String(r.value_to ?? "").trim() === "") return false;
              return true;
            };
            const usableRows = rows.filter(rowIsUsable);
            const incompleteCount = rows.length - usableRows.length;


            // Evaluate a single row → boolean.
            const evaluateRow = async (row: Row): Promise<{ passed: boolean; details: Record<string, unknown> }> => {
              const conditionType = row.condition;
              const value = row.value;
              const valueTo = row.value_to;
              const operator = row.operator;
              const twDays = row.time_window_days ? Number(row.time_window_days) : undefined;
              const sinceIso = twDays && twDays > 0
                ? new Date(Date.now() - twDays * 86_400_000).toISOString()
                : undefined;

              const countActivities = async (filters: (qb: any) => any) => {
                let q = supabase.from("lead_activities")
                  .select("id", { count: "exact", head: true })
                  .eq("workspace_id", workspace_id).eq("lead_id", lead_id);
                q = filters(q);
                if (sinceIso) q = q.gte("created_at", sinceIso);
                const { count } = await q;
                return count ?? 0;
              };
              const evalHappened = (count: number) =>
                operator === "not_happened" ? count === 0 : count > 0;

              let passed = false;

              if (conditionType === "score_gt") {
                const score = Number(lead.score || 0);
                const v = Number(value);
                if (operator === "less_than") passed = score < v;
                else if (operator === "equals") passed = score === v;
                else if (operator === "between") passed = score >= v && score <= Number(valueTo);
                else passed = score > v;
              } else if (conditionType === "has_tag") {
                passed = (lead.tags || []).includes(String(value));
              } else if (conditionType === "tag_contains") {
                const v = String(value || "").toLowerCase();
                const has = !!v && (lead.tags || []).some((t: string) => String(t).toLowerCase().includes(v));
                if (operator === "not_contains") passed = !has;
                else if (operator === "equals") passed = (lead.tags || []).map((t: string) => String(t).toLowerCase()).includes(v);
                else passed = has;
              } else if (conditionType === "source_equals") {
                const src = String(lead.source || "").toLowerCase();
                const v = String(value || "").toLowerCase();
                if (operator === "not_equals") passed = src !== v;
                else if (operator === "contains") passed = !!v && src.includes(v);
                else passed = src === v;
              } else if (conditionType === "email_known") {
                const known = !!(lead.email && String(lead.email).trim() !== "");
                passed = operator === "is_unknown" ? !known : known;
              } else if (conditionType === "phone_known") {
                const known = !!(lead.phone && String(lead.phone).trim() !== "");
                passed = operator === "is_unknown" ? !known : known;
              } else if (conditionType === "email_opened") {
                passed = evalHappened(await countActivities((q) => q.eq("type", "email_open")));
              } else if (conditionType === "link_clicked") {
                passed = evalHappened(await countActivities((q) => q.eq("type", "link_click")));
              } else if (conditionType === "form_submitted") {
                const slug = String(value || "").trim();
                passed = evalHappened(await countActivities((q) => {
                  let qq = q.eq("type", "form_submit");
                  if (slug) qq = qq.contains("meta", { funnel_slug: slug });
                  return qq;
                }));
              } else if (conditionType === "checkout_visited") {
                passed = evalHappened(await countActivities((q) => q.eq("type", "checkout_visit")));
              } else if (conditionType === "pricing_visited") {
                passed = evalHappened(await countActivities((q) => q.in("type", ["pricing_page_visit", "pricing_click"])));
              } else if (conditionType === "whatsapp_replied") {
                let q = supabase.from("sales_conversations")
                  .select("id", { count: "exact", head: true })
                  .eq("lead_id", lead_id).eq("direction", "inbound").eq("channel", "whatsapp");
                if (sinceIso) q = q.gte("created_at", sinceIso);
                const { count } = await q;
                passed = evalHappened(count ?? 0);
              } else if (conditionType === "appointment_booked") {
                let q = supabase.from("bookings")
                  .select("id", { count: "exact", head: true })
                  .eq("workspace_id", workspace_id).eq("lead_id", lead_id);
                if (sinceIso) q = q.gte("created_at", sinceIso);
                const { count } = await q;
                passed = evalHappened(count ?? 0);
              } else if (conditionType === "purchase_happened") {
                passed = evalHappened(await countActivities((q) => q.eq("type", "purchase")));
              } else if (conditionType === "has_replied" || conditionType === "no_reply") {
                const { data: replies } = await supabase
                  .from("sales_conversations")
                  .select("id")
                  .eq("lead_id", lead_id)
                  .eq("direction", "inbound")
                  .limit(1);
                const hasReply = !!(replies && replies.length > 0);
                passed = conditionType === "has_replied" ? hasReply : !hasReply;
              } else if (
                conditionType === "contact_field" || conditionType === "lead_status" ||
                conditionType === "pipeline_stage" || conditionType === "lifecycle_stage" ||
                conditionType === "owner_assigned" ||
                conditionType?.startsWith("opportunity_") ||
                conditionType?.startsWith("days_since_") ||
                ["replied_any", "sms_replied", "email_replied", "email_bounced", "unsubscribed", "marketing_consent"].includes(String(conditionType))
              ) {
                const extras = ((lead as any).__extra || {}) as Record<string, string>;
                const txt = (v: unknown) => String(v ?? "").trim().toLowerCase();
                const cmp = (actual: unknown): boolean => {
                  const a = txt(actual), b = txt(value);
                  switch (operator) {
                    case "not_equals": return a !== b;
                    case "contains": return !!b && a.includes(b);
                    case "not_contains": return !b || !a.includes(b);
                    case "is_known": return a !== "";
                    case "is_unknown": return a === "";
                    default: return a === b;
                  }
                };
                const num = (actual: unknown): boolean => {
                  const a = Number(actual), v = Number(value);
                  if (!Number.isFinite(a)) return false;
                  if (operator === "less_than") return a < v;
                  if (operator === "equals") return a === v;
                  if (operator === "between") return a >= v && a <= Number(valueTo);
                  return a > v;
                };
                const daysSince = (iso: unknown) => {
                  const t = iso ? new Date(String(iso)).getTime() : NaN;
                  return Number.isFinite(t) ? (Date.now() - t) / 86_400_000 : NaN;
                };
                const countConversations = async (filters: (qb: any) => any) => {
                  let q = supabase.from("sales_conversations")
                    .select("id", { count: "exact", head: true })
                    .eq("lead_id", lead_id).eq("direction", "inbound");
                  q = filters(q);
                  if (sinceIso) q = q.gte("created_at", sinceIso);
                  const { count } = await q;
                  return count ?? 0;
                };

                if (conditionType === "contact_field") {
                  const key = String(row.field || "");
                  const actual = extras[key] ?? (lead as any)[key];
                  passed = cmp(actual);
                } else if (conditionType === "lead_status") {
                  passed = cmp(lead.status);
                } else if (conditionType === "pipeline_stage") {
                  passed = cmp(lead.pipeline_stage);
                } else if (conditionType === "lifecycle_stage") {
                  passed = cmp(extras.lifecycle_stage);
                } else if (conditionType === "owner_assigned") {
                  const owner = extras.owner_user_id || lead.assigned_owner_id || "";
                  passed = operator === "is_unknown" ? !owner : !!owner;
                } else if (conditionType === "opportunity_exists") {
                  const has = !!extras.opportunity_id;
                  passed = operator === "not_happened" ? !has : has;
                } else if (conditionType === "opportunity_value") {
                  passed = num(extras.opportunity_amount);
                } else if (conditionType?.startsWith("opportunity_")) {
                  passed = cmp(extras[conditionType]);
                } else if (conditionType === "replied_any") {
                  passed = evalHappened(await countConversations((q) => q));
                } else if (conditionType === "sms_replied") {
                  passed = evalHappened(await countConversations((q) => q.eq("channel", "sms")));
                } else if (conditionType === "email_replied") {
                  passed = evalHappened(await countConversations((q) => q.eq("channel", "email")));
                } else if (conditionType === "email_bounced") {
                  let q = supabase.from("email_logs")
                    .select("id", { count: "exact", head: true })
                    .eq("lead_id", lead_id).in("status", ["bounced", "failed"]);
                  if (sinceIso) q = q.gte("created_at", sinceIso);
                  const { count } = await q;
                  passed = evalHappened(count ?? 0);
                } else if (conditionType === "unsubscribed") {
                  let opted = lead.sms_opt_out === true || lead.unsubscribed === true;
                  if (!opted && lead.email) {
                    const { data: sup } = await supabase.from("suppressed_emails")
                      .select("email").eq("email", String(lead.email).toLowerCase()).limit(1);
                    opted = !!(sup && sup.length > 0);
                  }
                  passed = operator === "is_false" ? !opted : opted;
                } else if (conditionType === "marketing_consent") {
                  const consent =
                    extras.consent_email === "true" || extras.consent_sms === "true" ||
                    extras.consent_whatsapp === "true" || txt(extras.consent_status) === "granted" ||
                    lead.sms_consent === true || !!lead.wa_opt_in_at;
                  passed = operator === "is_false" ? !consent : consent;
                } else if (conditionType === "days_since_created") {
                  passed = num(daysSince(lead.created_at));
                } else if (conditionType === "days_since_last_activity") {
                  passed = num(daysSince(lead.last_activity_at || lead.updated_at || lead.created_at));
                } else if (conditionType === "days_since_last_message") {
                  const { data: last } = await supabase.from("sales_conversations")
                    .select("created_at").eq("lead_id", lead_id)
                    .order("created_at", { ascending: false }).limit(1).maybeSingle();
                  passed = num(daysSince(last?.created_at));
                }
              } else if (config.field && config.operator) {
                const leadValue = (lead as any)[config.field as string];
                if (config.operator === "equals") passed = String(leadValue) === String(value);
                else if (config.operator === "not_equals") passed = String(leadValue) !== String(value);
                else if (config.operator === "contains") passed = String(leadValue || "").includes(String(value));
                else if (config.operator === "greater_than") passed = Number(leadValue) > Number(value);
                else if (config.operator === "less_than") passed = Number(leadValue) < Number(value);
                else if (config.operator === "has_tag") passed = (lead.tags || []).includes(value);
                else if (config.operator === "not_has_tag") passed = !(lead.tags || []).includes(value);
              }

              return {
                passed,
                details: { conditionType, field: row.field, operator, value, value_to: valueTo, time_window_days: twDays, passed },
              };
            };

            let passed = false;
            let unconfigured = false;
            let rowResults: Array<{ passed: boolean; details: Record<string, unknown> }> = [];

            // Reply-status is a special single-row case (it mutates pipeline_stage).
            const firstType = rows[0]?.condition;
            if (firstType === "reply_status") {
              const { data: replies } = await supabase
                .from("sales_conversations")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("direction", "inbound")
                .limit(1);
              const hasReply: boolean = !!(replies && replies.length > 0);
              const targetStage = hasReply
                ? String(config.replied_action || "")
                : String(config.no_reply_action || "continue");
              if (targetStage && targetStage !== "continue") {
                await supabase.from("leads").update({ pipeline_stage: targetStage }).eq("id", lead_id);
                details = { hasReply, movedTo: targetStage };
              } else {
                details = { hasReply, movedTo: null, action: "continue_sequence" };
              }
              passed = true;
            } else if (usableRows.length > 0) {
              rowResults = await Promise.all(usableRows.map(evaluateRow));
              passed = logic === "OR"
                ? rowResults.some((r) => r.passed)
                : rowResults.every((r) => r.passed);
              details = {
                logic,
                rows: rowResults.map((r) => r.details),
                ...(incompleteCount > 0 ? { skipped_incomplete_rows: incompleteCount } : {}),
                passed,
              };
            } else {
              unconfigured = true;
              details = {
                message: rows.length === 0
                  ? "Condition step has no rows configured — both branches skipped, automation continued"
                  : "Condition step is incomplete — both branches skipped, automation continued",
                unconfigured: true,
                passed: false,
              };
            }

            // Conditions are branching/wait points, NOT gates (legacy halt opt-in preserved).
            if (!unconfigured && !passed && config.halt_on_fail === true) {
              skipRemaining = true;
            }
            lastConditionPassed = unconfigured ? null : passed;
            lastConditionUnconfigured = unconfigured;
            status = unconfigured ? "condition_not_configured" : passed ? "success" : "condition_not_met";
            break;
          }


          case "delay": {
            console.log("Delay step config:", JSON.stringify(config));
            const delayMinutes = parseDelayFromConfig(config);
            console.log("Parsed delay minutes:", delayMinutes);
            if (delayMinutes <= 0) {
              details = { message: "Invalid delay value", config: { duration: config.duration, unit: config.unit, delay: config.delay }, rawConfig: config };
              status = "error";
              break;
            }

            const runAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
            const nextStepIndex = i + 1;

            if (nextStepIndex >= (steps || []).length) {
              details = { message: "Delay is last step, nothing to schedule", delay: config.delay };
              status = "completed";
              skipRemaining = true;
              break;
            }

            // Validate IDs are non-null UUID-shaped strings before insert
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRe.test(String(workspace_id)) || !uuidRe.test(String(automation_id)) || !uuidRe.test(String(lead_id))) {
              details = {
                error: "Invalid UUID(s) for delay scheduling",
                workspace_id, automation_id, lead_id,
              };
              status = "error";
              // Do NOT skipRemaining — let caller see this clearly but don't kill chain on next call
              break;
            }

            // Dedup check
            const { data: existingDelay } = await supabase
              .from("scheduled_jobs")
              .select("id")
              .eq("automation_id", automation_id)
              .eq("lead_id", lead_id)
              .eq("step_index", nextStepIndex)
              .eq("status", "pending")
              .limit(1);

            if (existingDelay && existingDelay.length > 0) {
              details = { message: "Delay already scheduled for this step", next_step_index: nextStepIndex };
              status = "skipped";
              skipRemaining = true;
              break;
            }

            // Insert with verification + 1 retry
            const insertPayload = {
              workspace_id,
              automation_id,
              lead_id,
              step_index: nextStepIndex,
              run_at: runAt,
              payload: {
                automation_id,
                lead_id,
                workspace_id,
                branch_context: {
                  branch_stack: branchStack,
                  last_condition_passed: lastConditionPassed,
                },
              },
              status: "pending",
            };

            const tryInsert = async () => {
              const r = await supabase
                .from("scheduled_jobs")
                .insert(insertPayload)
                .select("id")
                .maybeSingle();
              return r;
            };

            let { data: inserted, error: insErr } = await tryInsert();
            if (insErr || !inserted?.id) {
              console.error(`[execute-automation] scheduled_jobs insert failed (attempt 1):`, insErr);
              await new Promise((r) => setTimeout(r, 200));
              const retry = await tryInsert();
              inserted = retry.data;
              insErr = retry.error;
            }

            if (insErr || !inserted?.id) {
              // Critical: do NOT set skipRemaining. Log and continue so the
              // rest of the sequence still has a chance — the recovery job
              // will also try to repair this on its next sweep.
              console.error(`[execute-automation] scheduled_jobs insert FAILED after retry:`, insErr);
              await supabase.from("automation_logs").insert({
                automation_id, workspace_id, lead_id,
                event_type: "delay:error",
                status: "error",
                details: {
                  error: insErr?.message || "Insert returned no row",
                  next_step_index: nextStepIndex,
                  scheduled_run_at: runAt,
                  hint: "Recovery sweep will attempt re-queue",
                },
              });
              status = "error";
              details = { error: "Failed to schedule delay job", next_step_index: nextStepIndex, scheduled_run_at: runAt };
              // Continue loop — don't skipRemaining; we want the next non-delay step a fair chance
              break;
            }

            details = {
              scheduled_run_at: runAt,
              delay: config.delay,
              next_step_index: nextStepIndex,
              job_id: inserted.id,
            };
            status = "scheduled";
            skipRemaining = true;
            break;
          }

          default:
            details = { message: `Unknown step type: ${step.step_type}` };
            status = "skipped";
        }
      } catch (stepErr: any) {
        // CRITICAL: a thrown step error must NEVER set skipRemaining.
        // One failed action (bad credentials, transient provider hiccup) must
        // not nuke the rest of the sequence — only end_automation, an explicit
        // halt_on_fail condition, or a delay step are allowed to halt the chain.
        const errMsg = stepErr?.message || "Step execution failed";
        status = "error";
        details = { error: errMsg };
        console.error(`Step ${step.id} error:`, stepErr);

        // Best-effort credential alert if this looks like a provider auth failure
        try {
          const actionType = (config?.action || config?.action_type || config?.channel) as string | undefined;
          const channel = actionType === "send_email" ? "email"
            : actionType === "send_sms" ? "sms"
            : actionType === "send_whatsapp" ? "whatsapp"
            : null;
          if (channel && isCredentialError(channel, errMsg)) {
            details.provider_auth_error = true;
            await notifyCredentialFailure({
              workspaceId: workspace_id,
              channel: channel as any,
              errorMessage: errMsg,
              meta: { source: "execute-automation:outer-catch", automation_id, lead_id },
            });
          }
        } catch (_) { /* swallow alert errors */ }
      }

      // Log step execution
      await supabase.from("automation_logs").insert({
        automation_id,
        workspace_id,
        lead_id,
        event_type: `${step.step_type}:${config?.action || config?.action_type || "execute"}`,
        status,
        details,
      });

      results.push({ step_id: step.id, step_type: step.step_type, status, details });
    }

    // Increment run count
    await supabase.rpc("increment_automation_run", { _automation_id: automation_id });

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("execute-automation error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Execution failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
