import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssignmentState {
  workspace_id: string;
  last_assigned_user_id: string | null;
  round_robin_enabled: boolean;
  updated_at: string;
}

export function useAssignmentState(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["assignment-state", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("workspace_assignment_state")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return (data as AssignmentState | null);
    },
    enabled: !!workspaceId,
  });
}

export function useSetRoundRobin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, enabled }: { workspaceId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("workspace_assignment_state")
        .upsert(
          { workspace_id: workspaceId, round_robin_enabled: enabled },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["assignment-state", vars.workspaceId] });
    },
  });
}

export function useResetRotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from("workspace_assignment_state")
        .upsert(
          { workspace_id: workspaceId, last_assigned_user_id: null },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, workspaceId) => {
      qc.invalidateQueries({ queryKey: ["assignment-state", workspaceId] });
    },
  });
}
