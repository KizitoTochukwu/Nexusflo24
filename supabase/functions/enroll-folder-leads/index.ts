import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Enroll every lead in a folder into a specific automation.
 * Body: { workspace_id, automation_id, folder_id }
 *
 * Fires execute-automation for each lead with manual_enrollment=true (folder-scope guard skipped).
 * Throttled at 100ms between fires to stay polite with downstream services.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, automation_id, folder_id } = await req.json();
    if (!workspace_id || !automation_id || !folder_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id, automation_id, folder_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify folder belongs to workspace
    const { data: folder, error: folderErr } = await supabase
      .from("lead_folders")
      .select("id, name, workspace_id")
      .eq("id", folder_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    if (folderErr || !folder) {
      return new Response(
        JSON.stringify({ error: "Folder not found in this workspace" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify automation belongs to workspace
    const { data: automation, error: autoErr } = await supabase
      .from("automations")
      .select("id, name, workspace_id")
      .eq("id", automation_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    if (autoErr || !automation) {
      return new Response(
        JSON.stringify({ error: "Automation not found in this workspace" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch all leads in folder
    const { data: folderLeads, error: leadErr } = await supabase
      .from("lead_folder_leads")
      .select("lead_id")
      .eq("folder_id", folder_id)
      .eq("workspace_id", workspace_id);
    if (leadErr) {
      return new Response(
        JSON.stringify({ error: leadErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const leadIds = (folderLeads ?? []).map((r) => r.lead_id);
    if (leadIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enrolled: 0, message: "Folder is empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget — don't await each one (would time out). Kick them off in batches.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let enrolled = 0;
    let failed = 0;

    // Run in background using EdgeRuntime.waitUntil if available
    const runAll = async () => {
      for (const leadId of leadIds) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              automation_id,
              lead_id: leadId,
              workspace_id,
              manual_enrollment: true,
            }),
          });
          enrolled++;
        } catch (err) {
          console.error(`Enroll failed for lead ${leadId}:`, err);
          failed++;
        }
        await sleep(100);
      }
      console.log(`[enroll-folder-leads] Done. enrolled=${enrolled} failed=${failed} total=${leadIds.length}`);
    };

    // @ts-ignore — EdgeRuntime is provided by Supabase Deno runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runAll());
    } else {
      // Fallback: don't await
      runAll().catch((e) => console.error("runAll error:", e));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        queued: leadIds.length,
        message: `Queued ${leadIds.length} leads from "${folder.name}" into "${automation.name}". Processing in the background.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("enroll-folder-leads error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
