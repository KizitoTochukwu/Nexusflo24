// Enrollment dispatcher — invoked when a trigger fires.
// 1. Finds active workflows in this workspace whose trigger matches.
// 2. For each (workflow, lead) pair: checks suppression + duplicate guard, creates enrollment, kicks off execute-workflow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalCaller } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function leadIsSuppressed(lead: any, suppression: any): boolean {
  if (!suppression) return false;
  const tags: string[] = suppression.tags || [];
  if (tags.length && Array.isArray(lead.tags) && lead.tags.some((t: string) => tags.includes(t))) return true;
  const stages: string[] = suppression.lifecycleStages || [];
  if (stages.length && stages.includes(String(lead.status || "").toLowerCase())) return true;
  return false;
}

function triggerMatches(triggerNode: any, eventType: string, eventConfig: Record<string, any>): boolean {
  const sub = triggerNode?.data?.subType;
  if (!sub) return false;
  if (sub !== eventType) return false;
  const cfg = (triggerNode.data?.config || {}) as Record<string, any>;
  // Folder-scoped match
  if (sub === "lead_added_to_folder" && cfg.folder_id && eventConfig.folder_id) {
    return String(cfg.folder_id) === String(eventConfig.folder_id);
  }
  // Tag-scoped match
  if (sub === "lead_tagged" && cfg.tag && eventConfig.tag) {
    return String(cfg.tag).toLowerCase() === String(eventConfig.tag).toLowerCase();
  }
  // Score threshold
  if (sub === "score_threshold" && cfg.threshold && eventConfig.score !== undefined) {
    return Number(eventConfig.score) >= Number(cfg.threshold);
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = requireInternalCaller(req);
  if (guard) return guard;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { workspace_id, lead_ids, event_type, event_config = {} } = body as {
      workspace_id: string;
      lead_ids: string[];
      event_type: string;
      event_config?: Record<string, any>;
    };

    if (!workspace_id || !Array.isArray(lead_ids) || lead_ids.length === 0 || !event_type) {
      return new Response(JSON.stringify({ error: "workspace_id, lead_ids, event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workflows } = await supabase
      .from("workflows").select("*")
      .eq("workspace_id", workspace_id).eq("status", "active");

    if (!workflows || workflows.length === 0) {
      // Diagnostic breadcrumb so users can see "trigger fired but no workflow active"
      await supabase.from("workflow_logs").insert({
        workflow_id: null, workspace_id, enrollment_id: null, lead_id: lead_ids[0] || null,
        event_type: "no_match", level: "warn",
        message: `Trigger '${event_type}' fired but no active workflow exists`,
        details: { event_type, event_config, lead_count: lead_ids.length },
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({ ok: true, enrolled: 0, reason: "no_active_workflows" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrolledIds: string[] = [];
    let matchedWorkflows = 0;

    for (const wf of workflows) {
      const canvas = wf.canvas_json || { nodes: [] };
      const trig = (canvas.nodes || []).find((n: any) => n.data?.kind === "trigger");
      if (!triggerMatches(trig, event_type, event_config)) continue;
      matchedWorkflows++;

      for (const leadId of lead_ids) {
        const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
        if (!lead) continue;

        if (leadIsSuppressed(lead, wf.suppression_config)) continue;

        // Re-enrollment logic
        const { data: existing } = await supabase
          .from("workflow_enrollments")
          .select("id,status")
          .eq("workflow_id", wf.id).eq("lead_id", leadId)
          .order("started_at", { ascending: false })
          .limit(1);
        const last = existing?.[0];
        if (last) {
          if (last.status === "active") continue; // duplicate guard
          const allowReEnroll = !!wf.enrollment_config?.reEnrollment;
          if (!allowReEnroll) continue;
        }

        const { data: enrollment, error: insErr } = await supabase
          .from("workflow_enrollments")
          .insert({
            workflow_id: wf.id, workspace_id: wf.workspace_id, lead_id: leadId,
            status: "active", current_node_id: trig?.id || null, branch_path: [],
          })
          .select().maybeSingle();

        if (insErr || !enrollment) continue;
        enrolledIds.push(enrollment.id);

        await supabase.from("workflow_logs").insert({
          workflow_id: wf.id, workspace_id: wf.workspace_id, enrollment_id: enrollment.id, lead_id: leadId,
          event_type: "enrolled", message: `Lead enrolled via ${event_type}`,
        });

        // Kick off execution (fire-and-forget)
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ enrollment_id: enrollment.id }),
        }).catch((e) => console.error("[enroll] execute kickoff failed:", e));
      }
    }

    if (matchedWorkflows === 0) {
      await supabase.from("workflow_logs").insert({
        workflow_id: null, workspace_id, enrollment_id: null, lead_id: lead_ids[0] || null,
        event_type: "no_match", level: "warn",
        message: `Trigger '${event_type}' fired but no active workflow trigger node matched`,
        details: { event_type, event_config, active_workflows: workflows.length },
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({ ok: true, enrolled: enrolledIds.length, enrollment_ids: enrolledIds, matched_workflows: matchedWorkflows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enroll-workflow-leads error:", e);
    return new Response(JSON.stringify({ error: e?.message || "enroll_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
