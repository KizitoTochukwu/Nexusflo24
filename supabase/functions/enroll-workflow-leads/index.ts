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

function triggerMatches(wf: any, triggerNode: any, eventType: string, eventConfig: Record<string, any>): boolean {
  // Prefer new structured trigger columns; fall back to legacy canvas trigger node.
  const structuredEvent: string | null = wf?.trigger_event || null;
  const structuredCfg: Record<string, any> = wf?.trigger_config || {};
  const sub = structuredEvent || triggerNode?.data?.subType;
  if (!sub) return false;
  if (sub !== eventType) return false;
  const cfg = structuredEvent ? structuredCfg : ((triggerNode?.data?.config || {}) as Record<string, any>);

  const isAny = (v: any) => v === undefined || v === null || v === "" || v === "__any__";

  if (sub === "lead_added_to_folder" && !isAny(cfg.folder_id) && eventConfig.folder_id) {
    return String(cfg.folder_id) === String(eventConfig.folder_id);
  }
  if (sub === "lead_tagged" && !isAny(cfg.tag) && eventConfig.tag) {
    return String(cfg.tag).toLowerCase() === String(eventConfig.tag).toLowerCase();
  }
  if (sub === "score_threshold" && !isAny(cfg.threshold) && eventConfig.score !== undefined) {
    return Number(eventConfig.score) >= Number(cfg.threshold);
  }
  // Commerce scoping: optional store and product filters.
  if (!isAny(cfg.store_id) && eventConfig.store_id) {
    if (String(cfg.store_id) !== String(eventConfig.store_id)) return false;
  }
  if (!isAny(cfg.shop_product_id)) {
    const ids: string[] = Array.isArray(eventConfig.product_ids) ? eventConfig.product_ids.map(String) : [];
    if (ids.length && !ids.includes(String(cfg.shop_product_id))) return false;
  }
  return true;
}


/** Evaluate additional filter groups (AND across groups by default; OR/AND inside a group). */
function leadPassesFilters(lead: any, filterGroups: any[]): boolean {
  if (!Array.isArray(filterGroups) || filterGroups.length === 0) return true;
  const cmp = (raw: any, op: string, val: any): boolean => {
    const l = raw === undefined || raw === null ? "" : raw;
    const v = val === undefined || val === null ? "" : val;
    switch (op) {
      case "equals": return String(l).toLowerCase() === String(v).toLowerCase();
      case "not_equals": return String(l).toLowerCase() !== String(v).toLowerCase();
      case "contains": return String(l).toLowerCase().includes(String(v).toLowerCase());
      case "not_contains": return !String(l).toLowerCase().includes(String(v).toLowerCase());
      case "exists": return l !== "" && l !== null && l !== undefined;
      case "not_exists": return l === "" || l === null || l === undefined;
      case "gt": return Number(l) > Number(v);
      case "lt": return Number(l) < Number(v);
      case "gte": return Number(l) >= Number(v);
      case "lte": return Number(l) <= Number(v);
      case "in":
        return Array.isArray(v) ? v.map(String).includes(String(l)) : String(v).split(",").map((s) => s.trim()).includes(String(l));
      case "has_tag":
        return Array.isArray(lead?.tags) && lead.tags.map((t: string) => String(t).toLowerCase()).includes(String(v).toLowerCase());
      case "not_has_tag":
        return !(Array.isArray(lead?.tags) && lead.tags.map((t: string) => String(t).toLowerCase()).includes(String(v).toLowerCase()));
      default: return true;
    }
  };
  for (const group of filterGroups) {
    const conds = Array.isArray(group?.conditions) ? group.conditions : [];
    if (conds.length === 0) continue;
    const combinator = String(group?.combinator || "AND").toUpperCase();
    const evaluated = conds.map((c: any) => cmp(lead?.[c.property], c.operator, c.value));
    const groupPassed = combinator === "OR" ? evaluated.some(Boolean) : evaluated.every(Boolean);
    if (!groupPassed) return false;
  }
  return true;
}

/** Re-enrollment check using new structured reenrollment_config; falls back to legacy enrollment_config.reEnrollment. */
function canReEnroll(wf: any, lastEnrollment: any): boolean {
  const cfg = wf?.reenrollment_config;
  if (cfg && typeof cfg === "object" && cfg.mode) {
    const mode = String(cfg.mode);
    if (mode === "never") return false;
    if (mode === "every_event") return true;
    if (mode === "after_wait") {
      const amt = Number(cfg.wait_amount || 0);
      const unit = String(cfg.wait_unit || "hours");
      const mult: Record<string, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000 };
      const waitMs = amt * (mult[unit] || mult.hours);
      const last = lastEnrollment?.started_at ? new Date(lastEnrollment.started_at).getTime() : 0;
      return Date.now() - last >= waitMs;
    }
    if (mode === "on_status_change") return true;
    return false;
  }
  return !!wf?.enrollment_config?.reEnrollment;
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
      if (!triggerMatches(wf, trig, event_type, event_config)) continue;
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

        if (leadIsSuppressed(lead, wf.suppression_config)) {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null, lead_id: leadId,
            event_type: "suppressed", level: "info",
            message: `Lead suppressed by workflow suppression config`,
          }).then(() => {}, () => {});
          continue;
        }

        // Additional filter groups (from new trigger drawer)
        if (!leadPassesFilters(lead, wf.filter_groups || [])) {
          await supabase.from("workflow_logs").insert({
            workflow_id: wf.id, workspace_id, enrollment_id: null, lead_id: leadId,
            event_type: "filtered_out", level: "info",
            message: `Lead did not match trigger filters`,
            details: { filter_groups: wf.filter_groups },
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
          if (!canReEnroll(wf, last)) continue;
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
