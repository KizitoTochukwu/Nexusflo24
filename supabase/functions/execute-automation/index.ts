import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { blocksToHtml, parseBlocksFromMessage, interpolateBlocks } from "../_shared/email-blocks.ts";
import { buildLeadVars, interpolateText } from "../_shared/interpolate-vars.ts";
import { isCredentialError, notifyCredentialFailure } from "../_shared/credential-alert.ts";
import { requireInternalCaller } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function interpolate(template: string, lead: Record<string, any>): string {
  return interpolateText(template, buildLeadVars(lead as any));
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
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = requireInternalCaller(req);
  if (guard) return guard;

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

    // Resolve if workspace owner is admin → skip credit deduction
    const { data: ws } = await supabase.from("workspaces").select("owner_user_id").eq("id", workspace_id).single();
    const ownerIsAdmin = ws?.owner_user_id ? await isAdminUser(ws.owner_user_id) : false;
    if (ownerIsAdmin) console.log("[execute-automation] Admin workspace — credits exempt");

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
            const actionType = config.action || config.action_type || config.channel;

            // Rate-limit: wait at least 550ms between sends to stay under 2 req/s
            if (["send_email", "send_sms", "send_whatsapp"].includes(actionType)) {
              const elapsed = Date.now() - lastSendTime;
              if (lastSendTime > 0 && elapsed < 550) {
                await sleep(550 - elapsed);
              }

              // Credit deduction (admin bypass)
              if (!ownerIsAdmin) {
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
                logo: ts?.logo,
                unsubscribe: ts?.unsubscribe,
                footer: ts?.footer,
                unsubUrl,
              });
              try {
                const res = await sendResend(apiKey, `NexusFlo24 <${fromEmail}>`, lead.email, subject, html, "NexusFlo24 Support <support@nexusflo24.com>");
                lastSendTime = Date.now();
                details = { messageId: res.id, channel: "email" };
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
              try {
                const res = await sendTwilio(sid, token, from, lead.phone, body);
                lastSendTime = Date.now();
                details = { sid: res.sid, channel: "sms" };
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
              let waRes: Response;
              let waData: any = {};
              try {
                waRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ workspaceId: workspace_id, to: lead.phone, body, leadId: lead_id, skipCredits: true }),
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
                details = { tag, action: "added" };
              }
            } else if (actionType === "remove_tag") {
              const tag = config.tag;
              if (tag) {
                await supabase
                  .from("leads")
                  .update({ tags: (lead.tags || []).filter((t: string) => t !== tag) })
                  .eq("id", lead_id);
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
            };

            type Group = { logic?: string; rows: Row[] };

            // Build groups[]. Precedence:
            //   1) new `condition_groups` shape (guarded nested groups, max 1 level)
            //   2) legacy `conditions[]` shape → one group
            //   3) legacy single-row fields → one group / one row
            let groups: Group[] = [];
            const rawGroups = Array.isArray((config as any).condition_groups)
              ? ((config as any).condition_groups as Group[])
              : [];
            if (rawGroups.length) {
              groups = rawGroups
                .map((g) => ({
                  logic: ((g?.logic as string) || "AND").toUpperCase() === "OR" ? "OR" : "AND",
                  rows: Array.isArray(g?.rows) ? g.rows.filter((r) => r && r.condition) : [],
                }))
                .filter((g) => g.rows.length > 0);
            } else if (Array.isArray((config as any).conditions)) {
              const rs = ((config as any).conditions as Row[]).filter((r) => r && r.condition);
              if (rs.length) groups = [{ logic: ((config as any).logic as string) || "AND", rows: rs }];
            } else if (config.condition || config.field) {
              groups = [{
                logic: "AND",
                rows: [{
                  condition: (config.condition as string) || (config.field as string),
                  operator: config.operator as string | undefined,
                  value: config.value,
                  value_to: config.value_to,
                  time_window_days: config.time_window_days as number | undefined,
                  reply_check: config.reply_check as string | undefined,
                }],
              }];
            }
            const groupLogic = (((config as any).group_logic as string) || "AND").toUpperCase() === "OR" ? "OR" : "AND";
            // Legacy single-group rows + logic, used by the reply-status branch below.
            const rows: Row[] = groups[0]?.rows ?? [];
            const logic = groups[0]?.logic ?? "AND";

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
                details: { conditionType, operator, value, value_to: valueTo, time_window_days: twDays, passed },
              };
            };

            let passed = false;
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
            } else if (rows.length > 0) {
              rowResults = await Promise.all(rows.map(evaluateRow));
              passed = logic === "OR"
                ? rowResults.some((r) => r.passed)
                : rowResults.every((r) => r.passed);
              details = { logic, rows: rowResults.map((r) => r.details), passed };
            } else {
              details = { message: "Condition step has no rows configured", passed: false };
            }

            // Conditions are branching/wait points, NOT gates (legacy halt opt-in preserved).
            if (!passed && config.halt_on_fail === true) {
              skipRemaining = true;
            }
            lastConditionPassed = passed;
            status = passed ? "success" : "condition_not_met";
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
