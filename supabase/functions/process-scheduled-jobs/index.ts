import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Also check for scheduled campaigns ---
    const { data: scheduledCampaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);

    if (scheduledCampaigns && scheduledCampaigns.length > 0) {
      for (const camp of scheduledCampaigns) {
        try {
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

          // Re-fetch lead to get current phone/email
          const { data: lead } = await supabase
            .from("leads")
            .select("email, phone, full_name")
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

          const fbUrl =
            fbChannel === "sms"      ? `${supabaseUrl}/functions/v1/sms-send` :
            fbChannel === "whatsapp" ? `${supabaseUrl}/functions/v1/whatsapp-send` :
                                        `${supabaseUrl}/functions/v1/email-send`;

          const fbBody: Record<string, any> = fbChannel === "email"
            ? { workspaceId: fbWorkspaceId, to, subject: payload.subject || "", html: payload.body || "",
                leadId: fbLeadId, campaignId: fbCampaignId }
            : fbChannel === "whatsapp"
              ? { workspaceId: fbWorkspaceId, to, body: payload.body || "",
                  leadId: fbLeadId, campaignId: fbCampaignId }
              : { workspaceId: fbWorkspaceId, to, message: payload.body || "" };

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
