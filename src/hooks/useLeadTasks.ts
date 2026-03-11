import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type LeadTask = {
  id: string;
  lead_id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export function useLeadTasks(leadId: string | null, workspaceId: string) {
  return useQuery({
    queryKey: ["lead-tasks", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadTask[];
    },
    enabled: !!leadId && !!workspaceId,
  });
}

export function useCreateLeadTask() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: { lead_id: string; workspace_id: string; title: string; description?: string; due_date?: string }) => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert({ ...task, user_id: user!.id } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", vars.lead_id] });
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create task"),
  });
}

export function useToggleLeadTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed, lead_id }: { id: string; is_completed: boolean; lead_id: string }) => {
      const { error } = await supabase
        .from("lead_tasks")
        .update({ is_completed, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      return { lead_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", data.lead_id] });
    },
  });
}

export function useDeleteLeadTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await supabase.from("lead_tasks").delete().eq("id", id);
      if (error) throw error;
      return { lead_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", data.lead_id] });
      toast.success("Task deleted");
    },
  });
}
