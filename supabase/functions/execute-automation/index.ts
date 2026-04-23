import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { blocksToHtml, parseBlocksFromMessage, interpolateBlocks } from "../_shared/email-blocks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function interpolate(template: string, lead: Record<string, any>): string {
  return template
    .replace(/\{\{first_name\}\}/gi, lead.full_name?.split(" ")[0] || "there")
    .replace(/\{\{full_name\}\}/gi, lead.full_name || "")
    .replace(/\{\{email\}\}/gi, lead.email || "")
    .replace(/\{\{phone\}\}/gi, lead.phone || "")
    .replace(/\{\{source\}\}/gi, lead.source || "")
    .replace(/\{\{status\}\}/gi, lead.status || "");
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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { automation_id, lead_id, workspace_id, start_from_step } = await req.json();
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

    for (let i = startIndex; i < (steps || []).length; i++) {
      const step = steps![i];

      if (skipRemaining) {
        results.push({ step_id: step.id, step_type: step.step_type, status: "skipped", details: "Skipped due to condition or delay" });
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
                  throw new Error(creditResult.error || `Insufficient ${creditChannel} credits`);
                }
              }
            }

            if (actionType === "send_email") {
              const apiKey = Deno.env.get("RESEND_API_KEY");
              const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
              if (!apiKey) throw new Error("Email provider not configured");
              if (!lead.email) throw new Error("Lead has no email");
              // Skip if lead is unsubscribed
              if ((lead.tags || []).includes("unsubscribed")) {
                details = { message: "Lead is unsubscribed", channel: "email" };
                status = "skipped";
                break;
              }
              const subject = interpolate(config.subject || "Hello", lead);
              const rawBody = String(config.body || config.message || "");
              // Detect visual-editor JSON blocks vs plain text/html
              const blocks = parseBlocksFromMessage(rawBody);
              let renderedBody: string;
              if (blocks) {
                const interpolated = interpolateBlocks(blocks, (s) => interpolate(s, lead));
                renderedBody = blocksToHtml(interpolated);
              } else {
                renderedBody = formatEmailBody(interpolate(rawBody, lead));
              }
              // Wrap in branded template with user settings
              const appBaseUrl = "https://nexusflo24.lovable.app";
              const unsubUrl = `${appBaseUrl}/unsubscribe?lid=${lead_id}&wid=${workspace_id}`;
              const ts = config.templateSettings as Record<string, any> | undefined;
              let html = wrapEmailTemplate(renderedBody, {
                logo: ts?.logo,
                unsubscribe: ts?.unsubscribe,
                footer: ts?.footer,
                unsubUrl,
              });
              const res = await sendResend(apiKey, `NexusFlo24 <${fromEmail}>`, lead.email, subject, html, "NexusFlo24 Support <support@nexusflo24.com>");
              lastSendTime = Date.now();
              details = { messageId: res.id, channel: "email" };
            } else if (actionType === "send_sms") {
              const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
              const token = Deno.env.get("TWILIO_AUTH_TOKEN");
              const from = Deno.env.get("TWILIO_FROM_NUMBER");
              if (!sid || !token || !from) throw new Error("SMS provider not configured");
              if (!lead.phone) throw new Error("Lead has no phone");
              const body = interpolate(config.message || "", lead);
              const res = await sendTwilio(sid, token, from, lead.phone, body);
              lastSendTime = Date.now();
              details = { sid: res.sid, channel: "sms" };
            } else if (actionType === "send_whatsapp") {
              if (!lead.phone) throw new Error("Lead has no phone");
              const body = interpolate(config.message || "", lead);
              const waRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ workspaceId: workspace_id, to: lead.phone, body, leadId: lead_id, skipCredits: true }),
              });
              const waData = await waRes.json();
              if (!waRes.ok || !waData.success) throw new Error(waData?.error || "WhatsApp send failed");
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
              await supabase.from("notifications").insert({
                workspace_id,
                user_id: automation.user_id,
                title: interpolate(config.title || "Automation Alert", lead),
                body: interpolate(config.message || `Lead ${lead.full_name || lead.email} requires attention.`, lead),
                type: "automation_alert",
                meta: { lead_id, automation_id },
              });
              details = { notification: "sent" };
            } else {
              details = { message: `Unknown action type: ${actionType}` };
              status = "skipped";
            }
            break;
          }

          case "condition": {
            const conditionType = config.condition;
            const value = config.value;
            const valueTo = config.value_to;
            const operator = config.operator as string | undefined;
            const timeWindowDays = config.time_window_days
              ? Number(config.time_window_days)
              : undefined;
            const sinceIso = timeWindowDays && timeWindowDays > 0
              ? new Date(Date.now() - timeWindowDays * 86_400_000).toISOString()
              : undefined;
            let passed = false;

            // Helper: count rows in lead_activities for given lead/workspace, optionally with time filter and extra filters
            const countActivities = async (filters: (qb: any) => any) => {
              let q = supabase.from("lead_activities")
                .select("id", { count: "exact", head: true })
                .eq("workspace_id", workspace_id).eq("lead_id", lead_id);
              q = filters(q);
              if (sinceIso) q = q.gte("created_at", sinceIso);
              const { count } = await q;
              return count ?? 0;
            };

            // Apply "happened" / "not_happened" semantics around a count check
            const evalHappened = (count: number) => {
              if (operator === "not_happened") return count === 0;
              return count > 0; // default + "happened"
            };

            if (conditionType === "score_gt") {
              const score = Number(lead.score || 0);
              const v = Number(value);
              if (operator === "less_than") passed = score < v;
              else if (operator === "equals") passed = score === v;
              else if (operator === "between") passed = score >= v && score <= Number(valueTo);
              else passed = score > v; // default: greater_than
            } else if (conditionType === "has_tag") {
              passed = (lead.tags || []).includes(String(value));
            } else if (conditionType === "tag_contains") {
              const v = String(value || "").toLowerCase();
              const has = !!v && (lead.tags || []).some((t: string) => String(t).toLowerCase().includes(v));
              if (operator === "not_contains") passed = !has;
              else if (operator === "equals") passed = (lead.tags || []).map((t: string) => String(t).toLowerCase()).includes(v);
              else passed = has; // default: contains
            } else if (conditionType === "source_equals") {
              const src = String(lead.source || "").toLowerCase();
              const v = String(value || "").toLowerCase();
              if (operator === "not_equals") passed = src !== v;
              else if (operator === "contains") passed = !!v && src.includes(v);
              else passed = src === v; // default: equals
            } else if (conditionType === "email_known") {
              const known = !!(lead.email && String(lead.email).trim() !== "");
              passed = operator === "is_unknown" ? !known : known;
            } else if (conditionType === "phone_known") {
              const known = !!(lead.phone && String(lead.phone).trim() !== "");
              passed = operator === "is_unknown" ? !known : known;
            } else if (conditionType === "email_opened") {
              let q = supabase.from("email_logs")
                .select("id", { count: "exact", head: true })
                .eq("workspace_id", workspace_id).eq("lead_id", lead_id).eq("status", "opened");
              if (sinceIso) q = q.gte("created_at", sinceIso);
              const { count } = await q;
              passed = evalHappened(count ?? 0);
            } else if (conditionType === "link_clicked") {
              const c = await countActivities((q) => q.eq("type", "link_click"));
              passed = evalHappened(c);
            } else if (conditionType === "form_submitted") {
              const slug = String(value || "").trim();
              const c = await countActivities((q) => {
                let qq = q.eq("type", "form_submit");
                if (slug) qq = qq.contains("meta", { funnel_slug: slug });
                return qq;
              });
              passed = evalHappened(c);
            } else if (conditionType === "checkout_visited") {
              const c = await countActivities((q) => q.eq("type", "checkout_visit"));
              passed = evalHappened(c);
            } else if (conditionType === "pricing_visited") {
              const c = await countActivities((q) => q.in("type", ["pricing_page_visit", "pricing_click"]));
              passed = evalHappened(c);
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
              const c = await countActivities((q) => q.eq("type", "purchase"));
              passed = evalHappened(c);
            } else if (conditionType === "reply_status" || conditionType === "has_replied" || conditionType === "no_reply") {
              const { data: replies } = await supabase
                .from("sales_conversations")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("direction", "inbound")
                .limit(1);
              const hasReply = (replies && replies.length > 0);

              if (conditionType === "reply_status") {
                const targetStage = hasReply
                  ? String(config.replied_action || "")
                  : String(config.no_reply_action || "continue");
                if (targetStage && targetStage !== "continue") {
                  await supabase.from("leads").update({ pipeline_stage: targetStage }).eq("id", lead_id);
                  details = { hasReply, movedTo: targetStage };
                } else {
                  details = { hasReply, movedTo: null, action: "continue_sequence" };
                }
                passed = true; // Always pass — both outcomes handled, sequence continues
              } else {
                // Legacy: has_replied / no_reply as gate conditions
                passed = conditionType === "has_replied" ? hasReply : !hasReply;
              }
            }
            // Fallback: legacy field/operator format
            else if (config.field && config.operator) {
              const leadValue = (lead as any)[config.field];
              if (config.operator === "equals") passed = String(leadValue) === String(value);
              else if (config.operator === "not_equals") passed = String(leadValue) !== String(value);
              else if (config.operator === "contains") passed = String(leadValue || "").includes(String(value));
              else if (config.operator === "greater_than") passed = Number(leadValue) > Number(value);
              else if (config.operator === "less_than") passed = Number(leadValue) < Number(value);
              else if (config.operator === "has_tag") passed = (lead.tags || []).includes(value);
              else if (config.operator === "not_has_tag") passed = !(lead.tags || []).includes(value);
            }

            if (!passed) skipRemaining = true;
            details = { conditionType: conditionType || config.field, operator, value, value_to: valueTo, time_window_days: timeWindowDays, passed };
            status = passed ? "success" : "condition_failed";
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

            if (nextStepIndex < (steps || []).length) {
              // Prevent duplicate scheduled jobs for same automation+lead+step
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
              } else {
                await supabase.from("scheduled_jobs").insert({
                  workspace_id,
                  automation_id,
                  lead_id,
                  step_index: nextStepIndex,
                  run_at: runAt,
                  payload: { automation_id, lead_id, workspace_id },
                  status: "pending",
                });
                details = { scheduled_run_at: runAt, delay: config.delay, next_step_index: nextStepIndex };
                status = "scheduled";
              }
            } else {
              details = { message: "Delay is last step, nothing to schedule", delay: config.delay };
              status = "completed";
            }

            skipRemaining = true;
            break;
          }

          default:
            details = { message: `Unknown step type: ${step.step_type}` };
            status = "skipped";
        }
      } catch (stepErr: any) {
        status = "error";
        details = { error: stepErr?.message || "Step execution failed" };
        console.error(`Step ${step.id} error:`, stepErr);
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
