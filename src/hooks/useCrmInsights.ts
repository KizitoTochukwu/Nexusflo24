import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InsightsRange = 30 | 90 | 365;

export type StageBreakdown = {
  stage_id: string;
  name: string;
  color: string | null;
  probability: number;
  stage_type: string;
  count: number;
  value: number;
};

export type CrmInsights = {
  openValue: number;
  weightedValue: number;
  openCount: number;
  wonThisMonthValue: number;
  wonThisMonthCount: number;
  avgDealSize: number;
  avgDaysToClose: number | null;
  winRate: number;
  wonCount: number;
  lostCount: number;
  lostReasons: { reason: string; count: number }[];
  stages: StageBreakdown[];
  contactGrowth: { label: string; count: number }[];
  contactsBySource: { label: string; count: number }[];
  contactsByStage: { label: string; count: number }[];
  newContacts: number;
  tasks: { overdue: number; dueToday: number; completedThisWeek: number; open: number };
  tasksByOwner: { user_id: string | null; open: number; overdue: number; done: number }[];
  activityLeaders: { user_id: string | null; label: string; count: number }[];
  activityByType: { label: string; count: number }[];
  totalActivities: number;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const weekKey = (iso: string) => {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // Monday-first
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return monday.toISOString().slice(0, 10);
};

const tally = (values: (string | null | undefined)[], fallback = "Unknown") => {
  const map = new Map<string, number>();
  values.forEach((v) => {
    const key = v && String(v).trim() ? String(v) : fallback;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

export function useCrmInsights(workspaceId: string, range: InsightsRange = 90) {
  return useQuery({
    queryKey: ["crm-insights", workspaceId, range],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<CrmInsights> => {
      const since = new Date(Date.now() - range * 86_400_000).toISOString();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const todayStart = startOfDay(now);
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);
      const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

      const [dealsRes, stagesRes, contactsRes, tasksRes, activitiesRes] = await Promise.all([
        supabase
          .from("crm_deals" as any)
          .select("id,amount,status,stage_id,probability,created_at,closed_at,lost_reason,owner_user_id")
          .eq("workspace_id", workspaceId),
        supabase
          .from("crm_pipeline_stages" as any)
          .select("id,name,color,probability,stage_type,position,pipeline_id")
          .eq("workspace_id", workspaceId)
          .order("position", { ascending: true }),
        supabase
          .from("contacts" as any)
          .select("id,created_at,source,lifecycle_stage,archived_at")
          .eq("workspace_id", workspaceId)
          .is("archived_at", null)
          .gte("created_at", since),
        supabase
          .from("crm_tasks" as any)
          .select("id,status,due_date,completed_at,assigned_to,created_at")
          .eq("workspace_id", workspaceId),
        supabase
          .from("crm_activities" as any)
          .select("id,activity_type,actor_user_id,actor_label,occurred_at")
          .eq("workspace_id", workspaceId)
          .gte("occurred_at", since),
      ]);

      for (const r of [dealsRes, stagesRes, contactsRes, tasksRes, activitiesRes]) {
        if (r.error) throw r.error;
      }

      const deals = (dealsRes.data ?? []) as any[];
      const stageRows = (stagesRes.data ?? []) as any[];
      const contacts = (contactsRes.data ?? []) as any[];
      const tasks = (tasksRes.data ?? []) as any[];
      const activities = (activitiesRes.data ?? []) as any[];

      const stageById = new Map(stageRows.map((s) => [s.id, s]));

      const open = deals.filter((d) => d.status === "open");
      const openValue = open.reduce((s, d) => s + Number(d.amount || 0), 0);
      const weightedValue = open.reduce((s, d) => {
        const stage = d.stage_id ? stageById.get(d.stage_id) : null;
        const prob = d.probability ?? stage?.probability ?? 0;
        return s + Number(d.amount || 0) * (Number(prob) / 100);
      }, 0);

      const closedInRange = deals.filter(
        (d) => d.status !== "open" && d.closed_at && d.closed_at >= since,
      );
      const wonInRange = closedInRange.filter((d) => d.status === "won");
      const lostInRange = closedInRange.filter((d) => d.status === "lost");

      const wonThisMonth = deals.filter(
        (d) => d.status === "won" && d.closed_at && d.closed_at >= monthStart,
      );

      const closeDurations = wonInRange
        .map((d) => (new Date(d.closed_at).getTime() - new Date(d.created_at).getTime()) / 86_400_000)
        .filter((n) => Number.isFinite(n) && n >= 0);

      const stages: StageBreakdown[] = stageRows
        .filter((s) => s.stage_type === "open")
        .map((s) => {
          const inStage = open.filter((d) => d.stage_id === s.id);
          return {
            stage_id: s.id,
            name: s.name,
            color: s.color,
            probability: Number(s.probability ?? 0),
            stage_type: s.stage_type,
            count: inStage.length,
            value: inStage.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          };
        });

      const growthMap = new Map<string, number>();
      contacts.forEach((c) => {
        const k = weekKey(c.created_at);
        growthMap.set(k, (growthMap.get(k) ?? 0) + 1);
      });
      const contactGrowth = [...growthMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count }));

      const overdue = tasks.filter(
        (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < todayStart,
      );
      const dueToday = tasks.filter(
        (t) =>
          t.status !== "done" &&
          t.due_date &&
          new Date(t.due_date) >= todayStart &&
          new Date(t.due_date) < todayEnd,
      );
      const completedThisWeek = tasks.filter(
        (t) => t.status === "done" && t.completed_at && t.completed_at >= weekAgo,
      );
      const openTasks = tasks.filter((t) => t.status !== "done");

      const ownerIds = [...new Set(tasks.map((t) => t.assigned_to ?? null))];
      const tasksByOwner = ownerIds
        .map((uid) => ({
          user_id: uid,
          open: openTasks.filter((t) => (t.assigned_to ?? null) === uid).length,
          overdue: overdue.filter((t) => (t.assigned_to ?? null) === uid).length,
          done: completedThisWeek.filter((t) => (t.assigned_to ?? null) === uid).length,
        }))
        .filter((r) => r.open + r.overdue + r.done > 0)
        .sort((a, b) => b.open + b.done - (a.open + a.done));

      const leaderMap = new Map<string, { user_id: string | null; label: string; count: number }>();
      activities.forEach((a) => {
        const key = a.actor_user_id ?? a.actor_label ?? "system";
        const existing = leaderMap.get(key);
        if (existing) existing.count += 1;
        else
          leaderMap.set(key, {
            user_id: a.actor_user_id ?? null,
            label: a.actor_label ?? (a.actor_user_id ? "" : "Automation"),
            count: 1,
          });
      });

      const lostReasons = tally(lostInRange.map((d) => d.lost_reason))
        .slice(0, 5)
        .map(({ label, count }) => ({ reason: label === "Unknown" ? "No reason given" : label, count }));

      const totalWonLost = wonInRange.length + lostInRange.length;

      return {
        openValue,
        weightedValue,
        openCount: open.length,
        wonThisMonthValue: wonThisMonth.reduce((s, d) => s + Number(d.amount || 0), 0),
        wonThisMonthCount: wonThisMonth.length,
        avgDealSize: wonInRange.length
          ? wonInRange.reduce((s, d) => s + Number(d.amount || 0), 0) / wonInRange.length
          : open.length
            ? openValue / open.length
            : 0,
        avgDaysToClose: closeDurations.length
          ? Math.round(closeDurations.reduce((s, n) => s + n, 0) / closeDurations.length)
          : null,
        winRate: totalWonLost ? (wonInRange.length / totalWonLost) * 100 : 0,
        wonCount: wonInRange.length,
        lostCount: lostInRange.length,
        lostReasons,
        stages,
        contactGrowth,
        contactsBySource: tally(contacts.map((c) => c.source), "Direct").slice(0, 6),
        contactsByStage: tally(contacts.map((c) => c.lifecycle_stage), "Unset"),
        newContacts: contacts.length,
        tasks: {
          overdue: overdue.length,
          dueToday: dueToday.length,
          completedThisWeek: completedThisWeek.length,
          open: openTasks.length,
        },
        tasksByOwner,
        activityLeaders: [...leaderMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
        activityByType: tally(activities.map((a) => a.activity_type)).slice(0, 8),
        totalActivities: activities.length,
      };
    },
  });
}
