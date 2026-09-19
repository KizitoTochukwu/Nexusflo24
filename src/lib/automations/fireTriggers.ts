import { supabase } from "@/integrations/supabase/client";
import { eventMatchesCriterion, type ExitCriterion } from "@/lib/automations/exitCriteria";
import {
  matchTriggerScope,
  evaluateFilterGroups,
  scopeValueId,
  type FilterGroup,
} from "@/lib/workflows/triggerMatch";

/**
 * Fires automations matching a given trigger_type for the given lead(s).
 * Best-effort: errors are logged but never thrown so caller flows aren't broken.
 *
 * Matching rules:
 *  - automation.status === "active"
 *  - automation.trigger_type === triggerType
 *  - if triggerConfigMatch is provided, every key/value in it must match the
 *    automation's trigger_config (for folder_id / tag scoping).
 *
 * Additionally, this function checks ALL active automations in the workspace
 * for matching exit_criteria and cancels any pending scheduled_jobs for the
 * affected lead(s). This is what stops a long nurture sequence early when
 * the lead does something that should exit the flow (e.g. purchase).
 */
export async function fireAutomationsForLeads(params: {
  workspaceId: string;
  leadIds: string[];
  triggerType: string;
  triggerConfigMatch?: Record<string, string>;
}) {
  const { workspaceId, leadIds, triggerType, triggerConfigMatch } = params;
  if (!leadIds.length) return;

  // ---------- 1) Cancel pending jobs for any automation whose exit_criteria match this event ----------
  cancelMatchingScheduledJobs({
    workspaceId,
    leadIds,
    event: {
      type: triggerType,
      tag: triggerConfigMatch?.tag,
      status: triggerConfigMatch?.status,
    },
  }).catch((e) => console.error("[fireAutomationsForLeads] exit-criteria cancel error:", e));

  // ---------- 2) Matching + dispatch ----------
  // Non-exclusive: the same event is offered to BOTH engines using one shared
  // set of scope rules. Each engine keeps its own single-run guard, so a record
  // never enters the same automation or workflow twice for one event.
  try {
    const { data: autos, error } = await supabase
      .from("automations")
      .select("id, trigger_config, filter_groups")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", triggerType);
    if (error) throw error;

    for (const auto of autos ?? []) {
      const cfg = (auto.trigger_config ?? {}) as Record<string, any>;

      for (const leadId of leadIds) {
        const { data: lead } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .maybeSingle();
        if (!lead) continue;

        const resolvedKeys: Record<string, boolean> = {};
        const cfgFunnelId = scopeValueId(cfg.funnel_id);
        if (cfgFunnelId && !triggerConfigMatch?.funnel_id) {
          resolvedKeys.funnel_id = await leadAssociatedWithFunnel([leadId], cfgFunnelId);
        }

        const scope = matchTriggerScope({
          triggerConfig: cfg,
          eventConfig: (triggerConfigMatch || {}) as Record<string, any>,
          record: lead,
          resolvedKeys,
        });
        if (!scope.matched) continue;

        const filters = evaluateFilterGroups(lead, (auto.filter_groups || []) as FilterGroup[]);
        if (!filters.passed) continue;

        supabase.functions
          .invoke("execute-automation", {
            body: { automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId },
          })
          .catch((e) => console.error("[fireAutomationsForLeads] invoke error:", e));
      }
    }
  } catch (e) {
    console.error("[fireAutomationsForLeads] lookup error:", e);
  }

  // Workflows always get the event too.
  try {
    supabase.functions
      .invoke("enroll-workflow-leads", {
        body: {
          workspace_id: workspaceId,
          lead_ids: leadIds,
          event_type: triggerType,
          event_config: triggerConfigMatch || {},
        },
      })
      .catch((e) => console.error("[fireAutomationsForLeads] workflow invoke error:", e));
  } catch (e) {
    console.error("[fireAutomationsForLeads] workflow dispatch error:", e);
  }
}

/**
 * Returns true if any of the given leads is associated with the funnel via
 * funnel_visits (the only reliable lead↔funnel link in the schema).
 */
async function leadAssociatedWithFunnel(leadIds: string[], funnelId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from("funnel_visits")
      .select("id", { count: "exact", head: true })
      .eq("funnel_id", funnelId)
      .in("lead_id", leadIds);
    return (count ?? 0) > 0;
  } catch (e) {
    console.error("[leadAssociatedWithFunnel] lookup error:", e);
    return false;
  }
}

/**
 * Looks at all active automations in the workspace and cancels any pending
 * scheduled_jobs for the given lead(s) where the automation's exit_criteria
 * are matched by this event.
 */
async function cancelMatchingScheduledJobs(params: {
  workspaceId: string;
  leadIds: string[];
  event: { type: string; tag?: string; status?: string };
}) {
  const { workspaceId, leadIds, event } = params;

  const { data: autos, error } = await supabase
    .from("automations")
    .select("id, exit_criteria, name")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw error;

  const automationsToExit = (autos ?? []).filter((a) => {
    const criteria = (a.exit_criteria ?? []) as ExitCriterion[];
    if (!Array.isArray(criteria) || criteria.length === 0) return false;
    return criteria.some((c) => eventMatchesCriterion(c, event));
  });

  if (!automationsToExit.length) return;

  const automationIds = automationsToExit.map((a) => a.id);

  // Cancel pending jobs for these automations × these leads
  const { data: cancelled, error: cancelErr } = await supabase
    .from("scheduled_jobs")
    .update({ status: "cancelled", updated_at: new Date().toISOString(), error: `Exit criteria met: ${event.type}` })
    .eq("workspace_id", workspaceId)
    .in("automation_id", automationIds)
    .in("lead_id", leadIds)
    .eq("status", "pending")
    .select("id, automation_id, lead_id");

  if (cancelErr) {
    console.error("[cancelMatchingScheduledJobs] cancel error:", cancelErr);
    return;
  }

  if (cancelled && cancelled.length > 0) {
    console.log(
      `[exit-criteria] Cancelled ${cancelled.length} pending jobs across ${automationIds.length} automations for event=${event.type}`
    );
    // Best-effort: log the exit in automation_logs for visibility. Direct
    // inserts are service-role only, so this goes through the guarded RPC.
    const logs = cancelled.map((c) => ({
      automation_id: c.automation_id as string,
      lead_id: c.lead_id as string,
      event_type: `exit_criteria:${event.type}`,
      status: "cancelled",
      details: { reason: "Exit criteria matched", event },
    }));
    supabase
      .rpc("log_automation_events" as any, { _workspace_id: workspaceId, _entries: logs as any })
      .then(({ error: logErr }) => {
        if (logErr) console.error("[cancelMatchingScheduledJobs] log error:", logErr);
      });
  }
}
