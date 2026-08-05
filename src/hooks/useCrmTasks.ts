import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logCrmActivity } from "@/lib/crm/events";

export type CrmTask = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | string;
  status: "open" | "in_progress" | "done" | string;
  task_type: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskFilters = {
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  /** "overdue" | "today" | "week" | "none" */
  due?: string;
};

export type TaskLink = {
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function useCrmTasks(workspaceId: string, filters: TaskFilters = {}, link?: TaskLink) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["crm-tasks", workspaceId, filters, link],
    queryFn: async () => {
      let q = supabase
        .from("crm_tasks" as any)
        .select("*")
        .eq("workspace_id", workspaceId);

      if (link?.contact_id) q = q.eq("contact_id", link.contact_id);
      if (link?.company_id) q = q.eq("company_id", link.company_id);
      if (link?.deal_id) q = q.eq("deal_id", link.deal_id);
      if (link?.lead_id) q = q.eq("lead_id", link.lead_id);

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      if (filters.assigned_to && filters.assigned_to !== "all") q = q.eq("assigned_to", filters.assigned_to);
      if (filters.search?.trim()) q = q.ilike("title", `%${filters.search.trim()}%`);

      if (filters.due === "overdue") q = q.lt("due_date", new Date().toISOString()).neq("status", "done");
      if (filters.due === "today") {
        const start = startOfToday();
        const end = new Date(start.getTime() + 86400000);
        q = q.gte("due_date", start.toISOString()).lt("due_date", end.toISOString());
      }
      if (filters.due === "week") {
        const start = startOfToday();
        const end = new Date(start.getTime() + 7 * 86400000);
        q = q.gte("due_date", start.toISOString()).lt("due_date", end.toISOString());
      }
      if (filters.due === "none") q = q.is("due_date", null);

      const { data, error } = await q
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as CrmTask[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useTaskStats(workspaceId: string) {
  const { data: tasks = [] } = useCrmTasks(workspaceId);
  const now = Date.now();
  const todayEnd = startOfToday().getTime() + 86400000;
  return {
    total: tasks.length,
    open: tasks.filter((t) => t.status !== "done").length,
    overdue: tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date).getTime() < now).length,
    dueToday: tasks.filter(
      (t) => t.status !== "done" && t.due_date && new Date(t.due_date).getTime() < todayEnd && new Date(t.due_date).getTime() >= startOfToday().getTime(),
    ).length,
    completed: tasks.filter((t) => t.status === "done").length,
  };
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmTask> & { workspace_id: string; title: string }) => {
      const { data, error } = await supabase
        .from("crm_tasks" as any)
        .insert({ ...input, created_by: user?.id ?? null } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      const task = data as unknown as CrmTask;
      const recordType = task.contact_id ? "contact" : task.company_id ? "company" : task.deal_id ? "deal" : task.lead_id ? "lead" : null;
      const recordId = task.contact_id || task.company_id || task.deal_id || task.lead_id;
      if (recordType && recordId) {
        await logCrmActivity({
          workspaceId: task.workspace_id,
          recordType: recordType as any,
          recordId,
          activityType: "task_created",
          title: `Task: ${task.title}`,
          actorUserId: user?.id ?? null,
        });
      }
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message || "Could not create task"),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmTask> & { id: string }) => {
      const { error } = await supabase.from("crm_tasks" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-tasks"] }),
    onError: (e: any) => toast.error(e.message || "Could not update task"),
  });
}

export function useToggleTaskDone() {
  const update = useUpdateTask();
  return (task: CrmTask) =>
    update.mutate({
      id: task.id,
      status: task.status === "done" ? "open" : "done",
      completed_at: task.status === "done" ? null : new Date().toISOString(),
    });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_tasks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast.success("Task deleted");
    },
  });
}
