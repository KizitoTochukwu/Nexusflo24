import { supabase } from "@/integrations/supabase/client";
import { eventMatchesCriterion, type ExitCriterion } from "@/lib/automations/exitCriteria";

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

  // ---------- 2) Original matching + dispatch logic ----------
  // Exclusive dispatch: if any active LEGACY automation matches this trigger,
  // we send to execute-automation only. Otherwise we hand off to the new
  // Workflows engine. This stops both engines from running for the same
  // (automation, lead) pair, which was causing one engine to silently
  // overwrite the other's branch_context / scheduled_jobs state.
  let legacyMatched = false;
  try {
    const { data: autos, error } = await supabase
      .from("automations")
      .select("id, trigger_config")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", triggerType);
    if (error) throw error;

    const candidate = (autos ?? []).filter((a) => {
      const cfg = (a.trigger_config ?? {}) as Record<string, unknown>;
      if (!triggerConfigMatch) {
        // No event-side scope provided. Funnel-scoped automations need an
        // association lookup (handled below). Other scoped configs (tag,
        // status, folder, form) without a matching event value are skipped.
        const hasNonFunnelScope = Object.entries(cfg).some(
          ([k, v]) => k !== "funnel_id" && v !== undefined && v !== null && v !== ""
        );
        return !hasNonFunnelScope;
      }
      return Object.entries(triggerConfigMatch).every(([k, v]) => {
        const av = cfg[k];
        if (av === undefined || av === null || av === "") return true;
        return String(av) === String(v);
      });
    });

    // Resolve funnel-scope: when an automation has a funnel_id but the event
    // didn't carry one, check whether the lead has any association with that
    // funnel via funnel_visits or form_submissions→forms.
    const matched: typeof candidate = [];
    for (const auto of candidate) {
      const cfg = (auto.trigger_config ?? {}) as Record<string, unknown>;
      const cfgFunnelId = (cfg.funnel_id as string | null | undefined) || null;
      const eventFunnelId = (triggerConfigMatch?.funnel_id as string | undefined) || null;
      if (cfgFunnelId && !eventFunnelId) {
        const associated = await leadAssociatedWithFunnel(leadIds, cfgFunnelId);
        if (!associated) continue;
      }
      matched.push(auto);
    }

    legacyMatched = matched.length > 0;

    for (const auto of matched) {
      for (const leadId of leadIds) {
        supabase.functions
          .invoke("execute-automation", {
            body: {
              automation_id: auto.id,
              workspace_id: workspaceId,
              lead_id: leadId,
            },
          })
          .catch((e) => console.error("[fireAutomationsForLeads] invoke error:", e));
      }
    }
  } catch (e) {
    console.error("[fireAutomationsForLeads] lookup error:", e);
  }

  // Only dispatch to Workflows engine if no legacy automation took the trigger.
  if (!legacyMatched) {
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
}

/**
 * Returns true if any of the given leads is associated with the funnel via
 * funnel_visits or form_submissions whose form belongs to the funnel.
 */
async function leadAssociatedWithFunnel(leadIds: string[], funnelId: string): Promise<boolean> {
  try {
    const { count: visitCount } = await supabase
      .from("funnel_visits")
      .select("id", { count: "exact", head: true })
      .eq("funnel_id", funnelId)
      .in("lead_id", leadIds);
    if ((visitCount ?? 0) > 0) return true;

    const { data: funnelForms } = await supabase
      .from("forms")
      .select("id")
      .eq("funnel_id", funnelId as any);
    const formIds = (funnelForms ?? []).map((f: any) => f.id);
    if (formIds.length === 0) return false;

    const { count: subCount } = await supabase
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .in("form_id", formIds)
      .in("lead_id", leadIds);
    return (subCount ?? 0) > 0;
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
    // Best-effort: log the exit in automation_logs for visibility
    const logs = cancelled.map((c) => ({
      automation_id: c.automation_id as string,
      workspace_id: workspaceId,
      lead_id: c.lead_id as string,
      event_type: `exit_criteria:${event.type}`,
      status: "cancelled",
      details: { reason: "Exit criteria matched", event } as any,
    }));
    supabase.from("automation_logs").insert(logs as any).then(({ error: logErr }) => {
      if (logErr) console.error("[cancelMatchingScheduledJobs] log error:", logErr);
    });
  }
}
