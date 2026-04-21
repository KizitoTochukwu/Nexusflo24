import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fireAutomationsForLeads } from "@/lib/automations/fireTriggers";

export type LeadFolder = {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  lead_count?: number;
};

export function useLeadFolders(workspaceId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lead-folders", workspaceId],
    queryFn: async () => {
      const { data: folders, error } = await supabase
        .from("lead_folders")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get counts
      const { data: joins, error: jErr } = await supabase
        .from("lead_folder_leads")
        .select("folder_id")
        .eq("workspace_id", workspaceId);
      if (jErr) throw jErr;

      const counts: Record<string, number> = {};
      (joins ?? []).forEach((j: any) => {
        counts[j.folder_id] = (counts[j.folder_id] || 0) + 1;
      });

      return (folders ?? []).map((f: any) => ({
        ...f,
        lead_count: counts[f.id] || 0,
      })) as LeadFolder[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, color, workspace_id }: { name: string; color?: string; workspace_id: string }) => {
      const { data, error } = await supabase
        .from("lead_folders")
        .insert({ name, color: color || null, workspace_id, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create folder"),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("lead_folders")
        .update({ name } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      toast.success("Folder renamed");
    },
    onError: (e: any) => toast.error(e.message || "Failed to rename folder"),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      toast.success("Folder deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete folder"),
  });
}

export function useAssignLeadsToFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, folderId, workspaceId }: { leadIds: string[]; folderId: string; workspaceId: string }) => {
      const rows = leadIds.map((lead_id) => ({
        folder_id: folderId,
        lead_id,
        workspace_id: workspaceId,
      }));
      // upsert to avoid duplicates
      const { error } = await supabase
        .from("lead_folder_leads")
        .upsert(rows as any, { onConflict: "folder_id,lead_id" });
      if (error) throw error;

      // Fire matching automations (best-effort, non-blocking)
      fireAutomationsForLeads({
        workspaceId,
        leadIds,
        triggerType: "lead_added_to_folder",
        triggerConfigMatch: { folder_id: folderId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Leads added to folder");
    },
    onError: (e: any) => toast.error(e.message || "Failed to assign leads"),
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      // Delete in batches of 50
      for (let i = 0; i < leadIds.length; i += 50) {
        const batch = leadIds.slice(i, i + 50);
        const { error } = await supabase.from("leads").delete().in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      toast.success("Leads deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete leads"),
  });
}

export function useDeleteAllLeads() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, folderId }: { workspaceId: string; folderId?: string }) => {
      if (folderId) {
        // Get lead IDs in folder, then delete them
        const { data: joins, error: jErr } = await supabase
          .from("lead_folder_leads")
          .select("lead_id")
          .eq("folder_id", folderId);
        if (jErr) throw jErr;
        const ids = (joins ?? []).map((j: any) => j.lead_id);
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);
            const { error } = await supabase.from("leads").delete().in("id", batch);
            if (error) throw error;
          }
        }
      } else {
        const { error } = await supabase.from("leads").delete().eq("workspace_id", workspaceId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      qc.invalidateQueries({ queryKey: ["lead-folders"] });
      toast.success("All leads deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete all leads"),
  });
}

export function useFolderLeadIds(folderId: string | null, workspaceId: string) {
  return useQuery({
    queryKey: ["folder-lead-ids", folderId],
    queryFn: async () => {
      if (!folderId) return null;
      const { data, error } = await supabase
        .from("lead_folder_leads")
        .select("lead_id")
        .eq("folder_id", folderId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []).map((d: any) => d.lead_id as string);
    },
    enabled: !!folderId && !!workspaceId,
  });
}
