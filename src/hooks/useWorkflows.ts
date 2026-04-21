import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Workflow, WorkflowCanvasJSON } from "@/lib/workflows/types";

export function useWorkflows(workspaceId: string) {
  return useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Workflow[];
    },
    enabled: !!workspaceId,
  });
}

export function useWorkflow(workspaceId: string, workflowId: string | undefined) {
  return useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const { data, error } = await supabase
        .from("workflows" as any)
        .select("*")
        .eq("id", workflowId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Workflow | null;
    },
    enabled: !!workspaceId && !!workflowId,
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateWorkflow(workspaceId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      canvas_json?: WorkflowCanvasJSON;
      template_slug?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("workflows" as any)
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          name: input.name,
          description: input.description || "",
          canvas_json: input.canvas_json || { nodes: [], edges: [] },
          template_slug: input.template_slug || null,
          status: "draft",
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Workflow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows", workspaceId] }),
  });
}

export function useUpdateWorkflow(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Workflow> }) => {
      const { error } = await supabase
        .from("workflows" as any)
        .update(input.patch as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workflows", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workflow", vars.id] });
    },
  });
}

export function useDeleteWorkflow(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows", workspaceId] }),
  });
}

export function useWorkflowEnrollments(workflowId: string) {
  return useQuery({
    queryKey: ["workflow-enrollments", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_enrollments" as any)
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });
}
