import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SmartList {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  icon: string;
  filters: Record<string, string>;
  is_default: boolean;
  created_at: string;
}

export function useSmartLists(workspaceId: string) {
  return useQuery({
    queryKey: ["smart-lists", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smart_lists" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SmartList[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSmartList() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (list: { workspace_id: string; name: string; icon: string; filters: Record<string, string> }) => {
      const { data, error } = await supabase
        .from("smart_lists" as any)
        .insert({ ...list, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-lists"] });
      toast.success("Smart list saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save smart list"),
  });
}

export function useDeleteSmartList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("smart_lists" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-lists"] });
      toast.success("Smart list deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete smart list"),
  });
}
