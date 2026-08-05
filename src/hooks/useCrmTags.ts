import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CrmTag = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
};

export function useCrmTags(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-tags", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_tags" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CrmTag[];
    },
    enabled: !!workspaceId,
  });
}

/** Counts how many contacts carry each tag name (tags are stored as a text[] on contacts). */
export function useTagUsage(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-tag-usage", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("tags")
        .eq("workspace_id", workspaceId)
        .limit(5000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        for (const t of ((row as any).tags ?? []) as string[]) counts[t] = (counts[t] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertCrmTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; workspace_id: string; name: string; color: string; description?: string | null }) => {
      const payload = {
        workspace_id: input.workspace_id,
        name: input.name.trim(),
        color: input.color,
        description: input.description ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from("crm_tags" as any).update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("crm_tags" as any)
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tags"] });
      toast.success("Tag saved");
    },
    onError: (e: any) =>
      toast.error(e?.code === "23505" ? "A tag with that name already exists" : e?.message || "Could not save tag"),
  });
}

export function useDeleteCrmTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_tags" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tags"] });
      toast.success("Tag deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Could not delete tag"),
  });
}
