import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatEmailBody, wrapEmailTemplate } from "../_shared/email-layout.ts";

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

function parseDelay(delay: string): number {
  const match = delay?.match(/^(\d+)\s*(m|min|h|hr|d|day|w|week)s?$/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "m" || unit === "min") return value;
  if (unit === "h" || unit === "hr") return value * 60;
  if (unit === "d" || unit === "day") return value * 1440;
  if (unit === "w" || unit === "week") return value * 10080;
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

async function sendWhatsApp(token: string, phoneNumberId: string, to: string, body: string) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp error: ${res.status}`);
  return data;
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

    const results: any[] = [];
    let skipRemaining = false;
    const startIndex = typeof start_from_step === "number" ? start_from_step : 0;

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
              let html = interpolate(config.body || config.message || "", lead);
              // Append GDPR unsubscribe footer
              const baseUrl = Deno.env.get("SUPABASE_URL")!;
              const unsubUrl = `${baseUrl}/functions/v1/unsubscribe?lid=${lead_id}&wid=${workspace_id}`;
              const unsubFooter = `<div style="text-align:center;padding:24px 0 8px;border-top:1px solid #e5e7eb;margin-top:32px;"><span style="font-size:12px;color:#999999;">You received this email because you subscribed to NexusFlo24. <a href="${unsubUrl}" style="color:#0B1F3B;text-decoration:underline;">Unsubscribe</a></span></div>`;
              html += unsubFooter;
              const res = await sendResend(apiKey, `NexusFlo24 <${fromEmail}>`, lead.email, subject, html, "NexusFlo24 Support <support@nexusflo24.com>");
              details = { messageId: res.id, channel: "email" };
            } else if (actionType === "send_sms") {
              const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
              const token = Deno.env.get("TWILIO_AUTH_TOKEN");
              const from = Deno.env.get("TWILIO_FROM_NUMBER");
              if (!sid || !token || !from) throw new Error("SMS provider not configured");
              if (!lead.phone) throw new Error("Lead has no phone");
              const body = interpolate(config.message || "", lead);
              const res = await sendTwilio(sid, token, from, lead.phone, body);
              details = { sid: res.sid, channel: "sms" };
            } else if (actionType === "send_whatsapp") {
              const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
              const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
              if (!token || !phoneId) throw new Error("WhatsApp provider not configured");
              if (!lead.phone) throw new Error("Lead has no phone");
              const body = interpolate(config.message || "", lead);
              const res = await sendWhatsApp(token, phoneId, lead.phone, body);
              details = { waMessageId: res.messages?.[0]?.id, channel: "whatsapp" };
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
              const newStatus = config.status;
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
            const field = config.field;
            const operator = config.operator;
            const value = config.value;
            const leadValue = (lead as any)[field];
            let passed = false;

            if (operator === "equals") passed = String(leadValue) === String(value);
            else if (operator === "not_equals") passed = String(leadValue) !== String(value);
            else if (operator === "contains") passed = String(leadValue || "").includes(String(value));
            else if (operator === "greater_than") passed = Number(leadValue) > Number(value);
            else if (operator === "less_than") passed = Number(leadValue) < Number(value);
            else if (operator === "has_tag") passed = (lead.tags || []).includes(value);
            else if (operator === "not_has_tag") passed = !(lead.tags || []).includes(value);

            if (!passed) skipRemaining = true;
            details = { field, operator, value, passed };
            status = passed ? "success" : "condition_failed";
            break;
          }

          case "delay": {
            const delayMinutes = parseDelay(config.delay || "");
            if (delayMinutes <= 0) {
              details = { message: "Invalid delay value", delay: config.delay };
              status = "error";
              break;
            }

            const runAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
            const nextStepIndex = i + 1;

            if (nextStepIndex < (steps || []).length) {
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
