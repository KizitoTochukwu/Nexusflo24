import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CrmSavedView = {
  id: string;
  workspace_id: string;
  user_id: string;
  record_type: string;
  name: string;
  filters: Record<string, unknown>;
  columns: string[];
  sort: Record<string, unknown>;
  visibility: "private" | "shared";
  is_default: boolean;
  created_at: string;
};

export function useSavedViews(workspaceId: string, recordType = "contact") {
  return useQuery({
    queryKey: ["crm-saved-views", workspaceId, recordType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_saved_views" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("record_type", recordType)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CrmSavedView[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      record_type?: string;
      name: string;
      filters: Record<string, unknown>;
      columns: string[];
      sort?: Record<string, unknown>;
      visibility: "private" | "shared";
    }) => {
      const { data, error } = await supabase
        .from("crm_saved_views" as any)
        .insert({
          workspace_id: input.workspace_id,
          record_type: input.record_type ?? "contact",
          name: input.name,
          filters: input.filters,
          columns: input.columns,
          sort: input.sort ?? {},
          visibility: input.visibility,
          user_id: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-saved-views"] });
      toast.success("View saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save view"),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_saved_views" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-saved-views"] });
      toast.success("View deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete view"),
  });
}
