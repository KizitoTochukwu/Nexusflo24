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
        // Call execute-automation with start_from_step
        const payload = job.payload as Record<string, any> || {};
        const execRes = await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            automation_id: payload.automation_id || job.automation_id,
            lead_id: payload.lead_id || job.lead_id,
            workspace_id: payload.workspace_id || job.workspace_id,
            start_from_step: job.step_index,
          }),
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
