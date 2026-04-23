import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CONDITION_GROUPS } from "@/hooks/useAutomations";

export type SmartAction = {
  action: string;
  label: string;
  defaults?: Record<string, unknown>;
};

export type SmartActionRow = {
  id: string;
  workspace_id: string;
  condition_value: string;
  actions: SmartAction[];
  created_at: string;
  updated_at: string;
};

/** Fetch all overrides for the workspace, returned as a map keyed by condition_value. */
export function useSmartActionOverrides(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["smart-action-overrides", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {} as Record<string, SmartAction[]>;
      const { data, error } = await supabase
        .from("automation_smart_actions" as any)
        .select("condition_value, actions")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      const map: Record<string, SmartAction[]> = {};
      for (const row of (data ?? []) as any[]) {
        map[row.condition_value] = (row.actions ?? []) as SmartAction[];
      }
      return map;
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

/** Resolve effective smart actions for a condition (override → code default). */
export function resolveSmartActions(
  conditionValue: string,
  overrides: Record<string, SmartAction[]> | undefined,
): SmartAction[] {
  if (overrides && overrides[conditionValue]) return overrides[conditionValue];
  const opt = CONDITION_GROUPS.flatMap((g) => g.options).find((o) => o.value === conditionValue);
  return (opt?.suggestedActions as SmartAction[] | undefined) ?? [];
}

export function useSaveSmartActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; condition_value: string; actions: SmartAction[] }) => {
      // Defense-in-depth: re-validate before persisting (prevents bypass via direct hook calls).
      const { validateSmartActions } = await import("@/lib/automations/smartActionValidation");
      const result = validateSmartActions(input.actions);
      if (!result.isValid) {
        throw new Error(result.formError ?? result.rowErrors.find((e) => e) ?? "Invalid smart actions");
      }
      const { error } = await supabase
        .from("automation_smart_actions" as any)
        .upsert(
          {
            workspace_id: input.workspace_id,
            condition_value: input.condition_value,
            actions: input.actions as any,
          } as any,
          { onConflict: "workspace_id,condition_value" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-action-overrides"] });
      toast.success("Smart actions saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });
}

export function useResetSmartActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; condition_value: string }) => {
      const { error } = await supabase
        .from("automation_smart_actions" as any)
        .delete()
        .eq("workspace_id", input.workspace_id)
        .eq("condition_value", input.condition_value);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-action-overrides"] });
      toast.success("Reset to latest defaults");
    },
    onError: (e: any) => toast.error(e.message || "Failed to reset"),
  });
}

/** Wipe ALL workspace overrides so every condition falls back to the latest code defaults. */
export function useResetAllSmartActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspace_id: string }) => {
      const { error } = await supabase
        .from("automation_smart_actions" as any)
        .delete()
        .eq("workspace_id", input.workspace_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-action-overrides"] });
      toast.success("All conditions reset to latest defaults");
    },
    onError: (e: any) => toast.error(e.message || "Failed to reset all"),
  });
}

