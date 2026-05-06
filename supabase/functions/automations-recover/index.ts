// Self-healing sweep: finds automation_logs entries where a delay was
// "scheduled" but no matching scheduled_jobs row exists, and re-creates the
// missing row so the sequence resumes. Runs every 5 minutes via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Look at delay:execute scheduled events from the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: logErr } = await supabase
      .from("automation_logs")
      .select("id, automation_id, workspace_id, lead_id, details, created_at")
      .eq("event_type", "delay:execute")
      .eq("status", "scheduled")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (logErr) {
      console.error("[recover] log fetch error:", logErr);
      return new Response(JSON.stringify({ error: logErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recovered: any[] = [];
    const skipped: any[] = [];

    for (const row of candidates || []) {
      const d = (row.details || {}) as Record<string, any>;
      const nextStepIndex = Number(d.next_step_index);
      const runAtRaw = d.scheduled_run_at;
      if (!Number.isFinite(nextStepIndex) || !runAtRaw) {
        skipped.push({ log_id: row.id, reason: "missing next_step_index or scheduled_run_at" });
        continue;
      }
      if (!row.automation_id || !row.lead_id || !row.workspace_id) {
        skipped.push({ log_id: row.id, reason: "missing automation/lead/workspace id" });
        continue;
      }

      // Does a scheduled_job row already exist for this slot?
      const { data: existing } = await supabase
        .from("scheduled_jobs")
        .select("id, status")
        .eq("automation_id", row.automation_id)
        .eq("lead_id", row.lead_id)
        .eq("step_index", nextStepIndex)
        .limit(1);

      if (existing && existing.length > 0) {
        // Already there (pending, running, completed, etc.) — nothing to do
        continue;
      }

      // Re-insert missing job. If the original run_at is in the past, fire
      // it within the next minute so the lead isn't waiting forever.
      const origRun = new Date(runAtRaw).getTime();
      const runAt = origRun > Date.now() ? new Date(origRun).toISOString() : new Date(Date.now() + 60_000).toISOString();

      const { data: inserted, error: insErr } = await supabase
        .from("scheduled_jobs")
        .insert({
          workspace_id: row.workspace_id,
          automation_id: row.automation_id,
          lead_id: row.lead_id,
          step_index: nextStepIndex,
          run_at: runAt,
          payload: {
            automation_id: row.automation_id,
            lead_id: row.lead_id,
            workspace_id: row.workspace_id,
            recovered: true,
            source_log_id: row.id,
          },
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (insErr || !inserted?.id) {
        console.error(`[recover] re-insert failed for log ${row.id}:`, insErr);
        skipped.push({ log_id: row.id, reason: insErr?.message || "insert failed" });
        continue;
      }

      await supabase.from("automation_logs").insert({
        automation_id: row.automation_id,
        workspace_id: row.workspace_id,
        lead_id: row.lead_id,
        event_type: "delay:recovered",
        status: "scheduled",
        details: {
          original_log_id: row.id,
          job_id: inserted.id,
          next_step_index: nextStepIndex,
          original_run_at: runAtRaw,
          new_run_at: runAt,
        },
      });

      recovered.push({ log_id: row.id, job_id: inserted.id, next_step_index: nextStepIndex, run_at: runAt });
    }

    return new Response(JSON.stringify({
      ok: true,
      scanned: (candidates || []).length,
      recovered: recovered.length,
      skipped: skipped.length,
      details: { recovered, skipped },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[recover] error:", e);
    return new Response(JSON.stringify({ error: e?.message || "recover_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
