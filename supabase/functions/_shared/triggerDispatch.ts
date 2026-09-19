// Single dispatcher for enrolment trigger events.
//
// Every intake path (website webhook, hosted/embedded forms, funnels, imports,
// bookings, commerce) calls dispatchTriggerEvent so BOTH engines get the same
// event with the same scope rules:
//   1. Automations  -> execute-automation
//   2. Workflows    -> enroll-workflow-leads
//
// Each (automation, record, event) pair runs once: an `enrolled` row is written
// to automation_logs first and re-enrolment rules are applied against it.
import {
  matchTriggerScope,
  evaluateFilterGroups,
  canReEnrol,
  type FilterGroup,
} from "./triggerMatch.ts";

export interface DispatchParams {
  supabase: any;
  supabaseUrl: string;
  serviceKey: string;
  workspaceId: string;
  leadIds: string[];
  eventType: string;
  eventConfig?: Record<string, unknown>;
  /** Pre-loaded lead rows keyed by id, to save a round trip. */
  leads?: Record<string, Record<string, any>>;
}

async function loadLead(supabase: any, leadId: string, cache?: Record<string, any>) {
  if (cache?.[leadId]) return cache[leadId];
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  return data ?? null;
}

async function leadLinkedToFunnel(supabase: any, leadId: string, funnelId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from("funnel_visits")
      .select("id", { count: "exact", head: true })
      .eq("funnel_id", funnelId)
      .eq("lead_id", leadId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function logTriggerEvent(
  supabase: any,
  row: {
    automation_id: string | null;
    workspace_id: string;
    lead_id: string | null;
    event_type: string;
    status: string;
    details?: Record<string, unknown>;
  },
) {
  try {
    if (!row.automation_id) return; // automation_logs requires an automation
    await supabase.from("automation_logs").insert(row as any);
  } catch (e) {
    console.error("[triggerDispatch] log failed:", String(e));
  }
}

export async function dispatchTriggerEvent(params: DispatchParams): Promise<{
  automations_started: number;
  workflows_notified: boolean;
}> {
  const { supabase, supabaseUrl, serviceKey, workspaceId, leadIds, eventType } = params;
  const eventConfig = (params.eventConfig || {}) as Record<string, any>;
  let started = 0;

  if (!leadIds.length) return { automations_started: 0, workflows_notified: false };

  // ---------------- 1) Automations ----------------
  try {
    const { data: automations } = await supabase
      .from("automations")
      .select("id, name, trigger_config, filter_groups, reenrollment_config")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", eventType);

    for (const auto of automations ?? []) {
      const cfg = (auto.trigger_config ?? {}) as Record<string, any>;

      for (const leadId of leadIds) {
        const lead = await loadLead(supabase, leadId, params.leads);
        if (!lead) continue;

        // Funnel scope can be satisfied by an existing funnel association.
        const resolvedKeys: Record<string, boolean> = {};
        if (cfg.funnel_id && !eventConfig.funnel_id) {
          const fid = typeof cfg.funnel_id === "object" ? cfg.funnel_id?.id : cfg.funnel_id;
          if (fid && fid !== "__any__") {
            resolvedKeys.funnel_id = await leadLinkedToFunnel(supabase, leadId, String(fid));
          }
        }

        const scope = matchTriggerScope({
          triggerConfig: cfg,
          eventConfig,
          record: lead,
          resolvedKeys,
        });
        if (!scope.matched) {
          await logTriggerEvent(supabase, {
            automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId,
            event_type: `trigger:${eventType}`, status: "no_match",
            details: { reason: scope.reason, scope_key: scope.failedKey, event_config: eventConfig },
          });
          continue;
        }

        const filters = evaluateFilterGroups(lead, (auto.filter_groups || []) as FilterGroup[]);
        if (!filters.passed) {
          await logTriggerEvent(supabase, {
            automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId,
            event_type: `trigger:${eventType}`, status: "filtered_out",
            details: { reason: filters.reason, condition: filters.failed },
          });
          continue;
        }

        // Re-enrolment guard based on previous enrolments of this pair.
        const { data: prior } = await supabase
          .from("automation_logs")
          .select("created_at")
          .eq("automation_id", auto.id)
          .eq("lead_id", leadId)
          .eq("event_type", "enrolled")
          .order("created_at", { ascending: false })
          .limit(1);
        const last = prior?.[0];
        if (last && !canReEnrol(auto.reenrollment_config, { started_at: last.created_at, status: "completed" })) {
          await logTriggerEvent(supabase, {
            automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId,
            event_type: `trigger:${eventType}`, status: "duplicate_skipped",
            details: { reason: "Re-enrolment not allowed for this record", last_run: last.created_at },
          });
          continue;
        }

        await logTriggerEvent(supabase, {
          automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId,
          event_type: "enrolled", status: "success",
          details: { trigger: eventType, event_config: eventConfig },
        });

        try {
          await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ automation_id: auto.id, lead_id: leadId, workspace_id: workspaceId }),
          });
          started++;
        } catch (e) {
          console.error("[triggerDispatch] execute-automation failed:", String(e));
        }
      }
    }
  } catch (e) {
    console.error("[triggerDispatch] automation lookup failed:", String(e));
  }

  // ---------------- 2) Workflows ----------------
  let workflowsNotified = false;
  try {
    await fetch(`${supabaseUrl}/functions/v1/enroll-workflow-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        workspace_id: workspaceId,
        lead_ids: leadIds,
        event_type: eventType,
        event_config: eventConfig,
      }),
    });
    workflowsNotified = true;
  } catch (e) {
    console.error("[triggerDispatch] enroll-workflow-leads failed:", String(e));
  }

  return { automations_started: started, workflows_notified: workflowsNotified };
}
