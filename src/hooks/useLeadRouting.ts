import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LeadRoutingRule = {
  id: string;
  workspace_id: string;
  folder_id: string;
  match_field: string;
  match_value: string;
  is_active: boolean;
  created_at: string;
};

export function useRoutingRules(workspaceId: string) {
  return useQuery({
    queryKey: ["lead-routing-rules", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRoutingRule[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (rule: { workspace_id: string; folder_id: string; match_field: string; match_value: string }) => {
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .insert(rule as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lead-routing-rules", vars.workspace_id] });
      toast.success("Routing rule created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create rule"),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from("lead_routing_rules").delete().eq("id", id);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lead-routing-rules", data.workspaceId] });
      toast.success("Routing rule deleted");
    },
  });
}
