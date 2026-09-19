import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";
import { buildLeadVars, interpolateText } from "../_shared/interpolate-vars.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch due pending jobs (limit 50 to avoid timeout)
    const { data: jobs, error: fetchErr } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString())
      .order("run_at", { ascending: true })
      .limit(50);

    if (fetchErr) {
      console.error("Failed to fetch scheduled jobs:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Due scheduled campaigns. Runs on EVERY pass, whether or not other
    // jobs are pending, otherwise a quiet account never sends them. ---
    const { data: scheduledCampaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);

    for (const camp of scheduledCampaigns ?? []) {
      try {
        // Claim it first: only one runner can move it out of "scheduled",
        // so an overlapping cron pass cannot send the same campaign twice.
        const { data: claimed } = await supabase
          .from("campaigns")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", camp.id)
          .eq("status", "scheduled")
          .select("id");
        if (!claimed || claimed.length === 0) continue;

        await fetch(`${supabaseUrl}/functions/v1/execute-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ campaign_id: camp.id }),
        });
      } catch (e) {
        console.error(`Failed to execute scheduled campaign ${camp.id}:`, e);
      }
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const job of jobs) {
      // Mark as running
      const { error: lockErr } = await supabase
        .from("scheduled_jobs")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("status", "pending"); // Optimistic lock: only update if still pending

      if (lockErr) {
        console.error(`Failed to lock job ${job.id}:`, lockErr);
        results.push({ job_id: job.id, status: "lock_failed" });
        continue;
      }

      try {
        // Branch by payload type: campaign_fallback vs workflows vs legacy automations
        const payload = job.payload as Record<string, any> || {};

        // ---- Campaign fallback (SMS/WhatsApp/Email after primary failed) ----
        if (payload.type === "campaign_fallback") {
          const fbChannel = (payload.channel || "sms") as "sms" | "whatsapp" | "email";
          const fbWorkspaceId = payload.workspace_id || job.workspace_id;
          const fbLeadId = payload.lead_id || job.lead_id;
          const fbCampaignId = payload.campaign_id;

          // Honour the configured condition at send time: if the person has
          // since opened or replied on a primary channel, the fallback is
          // no longer wanted.
          const fbCondition = String(payload.condition || "failed");
          if (fbCondition === "unread" || fbCondition === "no_reply") {
            const { data: priorMsgs } = await supabase
              .from("campaign_messages")
              .select("opened, replied")
              .eq("campaign_id", fbCampaignId)
              .eq("lead_id", fbLeadId)
              .limit(50);
            const engaged = (priorMsgs ?? []).some((m: any) =>
              fbCondition === "no_reply" ? m.replied : (m.opened || m.replied));
            if (engaged) {
              await supabase.from("scheduled_jobs")
                .update({ status: "completed", error: null, updated_at: new Date().toISOString() })
                .eq("id", job.id);
              results.push({ job_id: job.id, status: "skipped_condition_met" });
              continue;
            }
          }

          // Re-fetch lead to get current phone/email (and to interpolate
          // {{vars}} in case the queued payload predates the normalizer).
          const { data: lead } = await supabase
            .from("leads")
            .select("id, email, phone, full_name, first_name, last_name, company, source, status, score, tags")
            .eq("id", fbLeadId)
            .maybeSingle();

          const to = fbChannel === "email" ? lead?.email : lead?.phone;
          if (!to) {
            const errMsg = `No ${fbChannel} contact info on lead`;
            await supabase.from("scheduled_jobs")
              .update({ status: "failed", error: errMsg, updated_at: new Date().toISOString() })
              .eq("id", job.id);
            await supabase.from("campaign_messages").insert({
              campaign_id: fbCampaignId, workspace_id: fbWorkspaceId, lead_id: fbLeadId,
              channel: fbChannel, delivery_status: "failed", error: errMsg,
            });
            results.push({ job_id: job.id, status: "failed", error: errMsg });
            continue;
          }

          // Defense-in-depth: re-sanitize legacy payloads. Older queued
          // jobs may contain raw HTML from the rich-text editor and/or
          // unresolved {{tokens}} from before the interpolation normalizer
          // was added. Apply both transforms here so the recipient never
          // sees raw markup or literal placeholders.
          const vars = lead ? buildLeadVars(lead as any) : {};
          const rawBody = String(payload.body || "");
          const plainBody = fbChannel === "email"
            ? rawBody // email-send accepts HTML
            : htmlToPlainText(rawBody);
          const finalBody = interpolateText(plainBody, vars);
          const finalSubject = interpolateText(String(payload.subject || ""), vars);

          const fbUrl =
            fbChannel === "sms"      ? `${supabaseUrl}/functions/v1/sms-send` :
            fbChannel === "whatsapp" ? `${supabaseUrl}/functions/v1/whatsapp-send` :
                                        `${supabaseUrl}/functions/v1/email-send`;

          const fbBody: Record<string, any> = fbChannel === "email"
            ? { workspaceId: fbWorkspaceId, to, subject: finalSubject || "Message from NexusFlo24", html: finalBody,
                leadId: fbLeadId, campaignId: fbCampaignId }
            : fbChannel === "whatsapp"
              ? { workspaceId: fbWorkspaceId, to, body: finalBody,
                  leadId: fbLeadId, campaignId: fbCampaignId }
              : { workspaceId: fbWorkspaceId, to, message: finalBody };

          const fbRes = await fetch(fbUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify(fbBody),
          });
          const fbData = await fbRes.json().catch(() => ({}));
          const fbOk = fbRes.ok && fbData?.success !== false;
          const fbErr = fbOk ? null : (fbData?.error || `HTTP ${fbRes.status}`);

          await supabase.from("campaign_messages").insert({
            campaign_id: fbCampaignId, workspace_id: fbWorkspaceId, lead_id: fbLeadId,
            channel: fbChannel,
            delivery_status: fbOk ? "delivered" : "failed",
            error: fbErr,
          });

          await supabase.from("scheduled_jobs")
            .update({
              status: fbOk ? "completed" : "failed",
              error: fbErr,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({ job_id: job.id, status: fbOk ? "completed" : "failed", error: fbErr });
          continue;
        }

        // ---- Workflow / legacy automation execution ----
        const isWorkflow = !!(payload.workflow_id && payload.enrollment_id);
        const targetUrl = isWorkflow
          ? `${supabaseUrl}/functions/v1/execute-workflow`
          : `${supabaseUrl}/functions/v1/execute-automation`;
        const targetBody = isWorkflow
          ? {
              enrollment_id: payload.enrollment_id,
              start_from_node: payload.start_from_node,
            }
          : {
              automation_id: payload.automation_id || job.automation_id,
              lead_id: payload.lead_id || job.lead_id,
              workspace_id: payload.workspace_id || job.workspace_id,
              start_from_step: job.step_index,
              branch_context: payload.branch_context,
            };
        const execRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(targetBody),
        });

        const execData = await execRes.json();

        if (execRes.ok && execData.ok) {
          await supabase
            .from("scheduled_jobs")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", job.id);
          results.push({ job_id: job.id, status: "completed" });
        } else {
          const errorMsg = execData.error || `HTTP ${execRes.status}`;
          await supabase
            .from("scheduled_jobs")
            .update({ status: "failed", error: errorMsg, updated_at: new Date().toISOString() })
            .eq("id", job.id);
          results.push({ job_id: job.id, status: "failed", error: errorMsg });
        }
      } catch (execErr: any) {
        const errorMsg = execErr?.message || "Execution error";
        console.error(`Job ${job.id} execution error:`, execErr);
        await supabase
          .from("scheduled_jobs")
          .update({ status: "failed", error: errorMsg, updated_at: new Date().toISOString() })
          .eq("id", job.id);
        results.push({ job_id: job.id, status: "failed", error: errorMsg });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("process-scheduled-jobs error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Processing failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
