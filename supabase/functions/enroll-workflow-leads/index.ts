// Enrollment dispatcher — invoked when a trigger fires.
// 1. Finds active workflows in this workspace whose trigger matches.
// 2. For each (workflow, lead) pair: checks suppression + duplicate guard, creates enrollment, kicks off execute-workflow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalCaller } from "../_shared/internal-auth.ts";
import {
  matchTriggerScope,
  evaluateFilterGroups,
  canReEnrol,
  type FilterGroup,
} from "../_shared/triggerMatch.ts";

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

/** Event-name match only. Scope is evaluated per-record (it can depend on the record). */
function eventMatches(wf: any, triggerNode: any, eventType: string): boolean {
  const sub = wf?.trigger_event || triggerNode?.data?.subType;
  return !!sub && sub === eventType;
}

/** The trigger settings to evaluate scope against (structured first, legacy canvas second). */
function effectiveTriggerConfig(wf: any, triggerNode: any): Record<string, any> {
  if (wf?.trigger_event) return (wf.trigger_config || {}) as Record<string, any>;
  return (triggerNode?.data?.config || {}) as Record<string, any>;
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
      if (!eventMatches(wf, trig, event_type)) continue;
      const triggerCfg = effectiveTriggerConfig(wf, trig);
      matchedWorkflows++;

      // Webhook / duplicate-event guard (e.g. Meta leadgen_id retries).
      const externalId = event_config?.external_event_id
        || event_config?.leadgen_id
        || event_config?.event_id
        || null;
      if (externalId) {
        const { error: dupErr } = await supabase.from("processed_automation_events").insert({
          workspace_id, workflow_id: wf.id, event_key: event_type,
          external_event_id: String(externalId), event_payload: event_config,
        });
        if (dupErr && (dupErr as any).code === "23505") {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null,
            lead_id: lead_ids[0] || null,
            event_type: "duplicate_event", level: "info",
            message: `Skipped duplicate ${event_type} (external id ${externalId})`,
            details: { external_event_id: externalId },
          }).then(() => {}, () => {});
          continue;
        }
      }


      for (const leadId of lead_ids) {
        const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
        if (!lead) continue;

        // Scope (funnel scope may be satisfied by an existing funnel visit)
        const resolvedKeys: Record<string, boolean> = {};
        const cfgFunnel = typeof triggerCfg.funnel_id === "object"
          ? triggerCfg.funnel_id?.id
          : triggerCfg.funnel_id;
        if (cfgFunnel && cfgFunnel !== "__any__" && !event_config.funnel_id) {
          const { count } = await supabase
            .from("funnel_visits")
            .select("id", { count: "exact", head: true })
            .eq("funnel_id", String(cfgFunnel))
            .eq("lead_id", leadId);
          resolvedKeys.funnel_id = (count ?? 0) > 0;
        }
        const scope = matchTriggerScope({
          triggerConfig: triggerCfg,
          eventConfig: event_config,
          record: lead,
          resolvedKeys,
        });
        if (!scope.matched) {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null, lead_id: leadId,
            event_type: "out_of_scope", level: "info",
            message: scope.reason || "Event outside this trigger's scope",
            details: { scope_key: scope.failedKey, trigger_config: triggerCfg, event_config },
          }).then(() => {}, () => {});
          continue;
        }

        if (leadIsSuppressed(lead, wf.suppression_config)) {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null, lead_id: leadId,
            event_type: "suppressed", level: "info",
            message: `Lead suppressed by workflow suppression config`,
          }).then(() => {}, () => {});
          continue;
        }

        // Additional filter groups (from the trigger drawer)
        const filters = evaluateFilterGroups(lead, (wf.filter_groups || []) as FilterGroup[]);
        if (!filters.passed) {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null, lead_id: leadId,
            event_type: "filtered_out", level: "info",
            message: filters.reason || "Lead did not match trigger filters",
            details: { condition: filters.failed },
          }).then(() => {}, () => {});
          continue;
        }

        // Re-enrollment logic (structured reenrollment_config, with legacy fallback)
        const { data: existing } = await supabase
          .from("workflow_enrollments")
          .select("id,status,started_at")
          .eq("workflow_id", wf.id).eq("lead_id", leadId)
          .order("started_at", { ascending: false })
          .limit(1);
        const last = existing?.[0];
        if (last) {
          if (last.status === "active") continue; // duplicate guard
          const legacyAllow = !!wf?.enrollment_config?.reEnrollment;
          if (!canReEnrol(wf.reenrollment_config, { started_at: last.started_at, status: last.status }, legacyAllow)) continue;
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
