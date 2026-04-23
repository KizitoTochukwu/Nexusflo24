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

/**
 * Aggregated diagnostics for a workflow:
 * - 24h enrollment counts by status
 * - Latest enrollments, logs, runs
 * - Pending scheduled jobs (from delay nodes)
 * - Per-node run counts (success / failed / skipped)
 */
export function useWorkflowDiagnostics(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["workflow-diagnostics", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [enrollments24h, recentEnrollments, logs, runs, scheduled, allRuns] = await Promise.all([
        supabase.from("workflow_enrollments" as any)
          .select("id,status,started_at")
          .eq("workflow_id", workflowId)
          .gte("started_at", since),
        supabase.from("workflow_enrollments" as any)
          .select("id,status,lead_id,started_at,completed_at,exit_reason,steps_executed,is_test,current_node_id")
          .eq("workflow_id", workflowId)
          .order("started_at", { ascending: false })
          .limit(20),
        supabase.from("workflow_logs" as any)
          .select("id,event_type,level,message,details,created_at,lead_id,enrollment_id")
          .eq("workflow_id", workflowId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("workflow_runs" as any)
          .select("id,node_id,node_type,status,branch_taken,error,details,ran_at,lead_id,is_test")
          .eq("workflow_id", workflowId)
          .order("ran_at", { ascending: false })
          .limit(30),
        supabase.from("scheduled_jobs" as any)
          .select("id,run_at,status,payload,lead_id,error")
          .eq("automation_id", workflowId) // engine reuses this column for workflow id
          .eq("status", "pending")
          .order("run_at", { ascending: true })
          .limit(50),
        supabase.from("workflow_runs" as any)
          .select("node_id,status")
          .eq("workflow_id", workflowId)
          .limit(2000),
      ]);

      const counts: Record<string, number> = { active: 0, completed: 0, exited: 0, failed: 0 };
      (enrollments24h.data || []).forEach((e: any) => {
        counts[e.status] = (counts[e.status] || 0) + 1;
      });

      // Per-node aggregation
      const perNode: Record<string, { success: number; failed: number; skipped: number; total: number }> = {};
      (allRuns.data || []).forEach((r: any) => {
        const nid = r.node_id || "unknown";
        if (!perNode[nid]) perNode[nid] = { success: 0, failed: 0, skipped: 0, total: 0 };
        perNode[nid].total++;
        if (r.status === "success") perNode[nid].success++;
        else if (r.status === "failed") perNode[nid].failed++;
        else if (r.status === "skipped") perNode[nid].skipped++;
      });

      return {
        counts24h: counts,
        recentEnrollments: recentEnrollments.data || [],
        logs: logs.data || [],
        runs: runs.data || [],
        scheduled: scheduled.data || [],
        perNode,
      };
    },
    enabled: !!workflowId,
    refetchInterval: 15000, // live refresh every 15s while panel open
  });
}

/**
 * Fires a test enrollment for a single lead. Engine respects `is_test=true`
 * and skips real sends (email/sms/whatsapp) so you can verify branching/wiring
 * without burning credits.
 */
export function useTestEnrollWorkflow() {
  return useMutation({
    mutationFn: async (input: { workflow_id: string; workspace_id: string; lead_id: string }) => {
      // Insert a test enrollment directly so the lead doesn't need to match the trigger event
      const { data: wf, error: wfErr } = await supabase
        .from("workflows" as any)
        .select("canvas_json")
        .eq("id", input.workflow_id)
        .maybeSingle();
      if (wfErr) throw wfErr;
      const canvas = (wf as any)?.canvas_json || { nodes: [] };
      const trig = (canvas.nodes || []).find((n: any) => n.data?.kind === "trigger");

      const { data: enrollment, error: insErr } = await supabase
        .from("workflow_enrollments" as any)
        .insert({
          workflow_id: input.workflow_id,
          workspace_id: input.workspace_id,
          lead_id: input.lead_id,
          status: "active",
          current_node_id: trig?.id || null,
          branch_path: [],
          is_test: true,
        })
        .select()
        .maybeSingle();
      if (insErr) throw insErr;

      const { error: invokeErr } = await supabase.functions.invoke("execute-workflow", {
        body: { enrollment_id: (enrollment as any).id },
      });
      if (invokeErr) throw invokeErr;

      return enrollment;
    },
  });
}

/**
 * Search leads in a workspace by name or email — used by the test enrollment picker.
 */
export function useLeadSearch(workspaceId: string, search: string) {
  return useQuery({
    queryKey: ["lead-search", workspaceId, search],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("id,full_name,email,tags,status,score")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`email.ilike.${s},full_name.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

/**
 * Re-runs `execute-workflow` for an enrollment from a specific node.
 * Used by Diagnostics → "Resume now" on stranded enrollments.
 */
export function useResumeEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enrollment_id: string; start_from_node?: string | null; workflow_id: string }) => {
      const { error } = await supabase.functions.invoke("execute-workflow", {
        body: { enrollment_id: input.enrollment_id, start_from_node: input.start_from_node || undefined },
      });
      if (error) throw error;
      return true;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workflow-diagnostics", vars.workflow_id] });
    },
  });
}

