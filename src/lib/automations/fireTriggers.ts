import { supabase } from "@/integrations/supabase/client";

/**
 * Fires automations matching a given trigger_type for the given lead(s).
 * Best-effort: errors are logged but never thrown so caller flows aren't broken.
 *
 * Matching rules:
 *  - automation.status === "active"
 *  - automation.trigger_type === triggerType
 *  - if triggerConfigMatch is provided, every key/value in it must match the
 *    automation's trigger_config (for folder_id / tag scoping).
 */
export async function fireAutomationsForLeads(params: {
  workspaceId: string;
  leadIds: string[];
  triggerType: string;
  triggerConfigMatch?: Record<string, string>;
}) {
  const { workspaceId, leadIds, triggerType, triggerConfigMatch } = params;
  if (!leadIds.length) return;

  try {
    const { data: autos, error } = await supabase
      .from("automations")
      .select("id, trigger_config")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", triggerType);
    if (error) throw error;

    const matched = (autos ?? []).filter((a) => {
      if (!triggerConfigMatch) return true;
      const cfg = (a.trigger_config ?? {}) as Record<string, unknown>;
      return Object.entries(triggerConfigMatch).every(([k, v]) => {
        // empty/undefined in automation config means "any" — accept.
        const av = cfg[k];
        if (av === undefined || av === null || av === "") return true;
        return String(av) === String(v);
      });
    });

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
}
