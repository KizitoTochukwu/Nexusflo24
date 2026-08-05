import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlarmClock, BarChart3, CheckCircle2, Download, Gauge, RefreshCw, Target, TrendingUp, Users,
} from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useCrmInsights, type InsightsRange } from "@/hooks/useCrmInsights";
import { exportRowsToCsv } from "@/lib/crm/csv";
import { BarList, CountRow, EmptyHint, InsightsCard, InsightsStat } from "@/components/crm/insights/InsightsCards";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const weekLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DashboardCrmInsights = () => {
  const workspaceId = useWorkspaceId();
  const [range, setRange] = useState<InsightsRange>(90);
  const { data, isLoading, isError, error, refetch, isFetching } = useCrmInsights(workspaceId, range);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    (members as any[]).forEach((m) => map.set(m.user_id, m.full_name || m.email || "Member"));
    return map;
  }, [members]);

  const nameFor = (uid: string | null, fallback = "Unassigned") =>
    uid ? memberName.get(uid) || `${uid.slice(0, 8)}…` : fallback;

  const exportSummary = () => {
    if (!data) return;
    exportRowsToCsv(
      `crm-insights-${range}d`,
      [
        { metric: "Open pipeline value", value: data.openValue },
        { metric: "Weighted forecast", value: Math.round(data.weightedValue) },
        { metric: "Open deals", value: data.openCount },
        { metric: "Won this month (value)", value: data.wonThisMonthValue },
        { metric: "Won this month (count)", value: data.wonThisMonthCount },
        { metric: "Average deal size", value: Math.round(data.avgDealSize) },
        { metric: "Average days to close", value: data.avgDaysToClose ?? "" },
        { metric: `Win rate (${range}d %)`, value: data.winRate.toFixed(1) },
        { metric: `New contacts (${range}d)`, value: data.newContacts },
        { metric: "Overdue tasks", value: data.tasks.overdue },
        { metric: "Tasks completed this week", value: data.tasks.completedThisWeek },
        { metric: `Activities logged (${range}d)`, value: data.totalActivities },
      ],
      [{ key: "metric", label: "Metric" }, { key: "value", label: "Value" }],
    );
  };

  return (
    <div className="space-y-6">
      <Seo
        title="CRM Insights | NexusFlo24"
        description="Pipeline forecasting, win/loss analysis, contact growth and team activity across your CRM."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM Insights</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline health, conversion and team performance across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(range)} onValueChange={(v) => setRange(Number(v) as InsightsRange)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportSummary} disabled={!data}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load insights: {(error as any)?.message || "unknown error"}
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <InsightsStat label="Open pipeline" value={money(data.openValue)} hint={`${data.openCount} open deals`} icon={BarChart3} />
            <InsightsStat label="Weighted forecast" value={money(data.weightedValue)} hint="Stage probability applied" icon={Target} />
            <InsightsStat label="Won this month" value={money(data.wonThisMonthValue)} hint={`${data.wonThisMonthCount} deals closed`} icon={TrendingUp} />
            <InsightsStat label="Average deal size" value={money(data.avgDealSize)} hint={`Win rate ${data.winRate.toFixed(0)}%`} icon={Gauge} />
            <InsightsStat
              label="Avg days to close"
              value={data.avgDaysToClose == null ? "—" : `${data.avgDaysToClose} days`}
              hint={`${data.wonCount} won · ${data.lostCount} lost`}
              icon={CheckCircle2}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightsCard
              title="Pipeline by stage"
              description="Open deal value in each stage, with stage-to-stage conversion."
              action={<Button asChild variant="ghost" size="sm"><Link to="../deals">Open deals</Link></Button>}
            >
              <BarList
                items={data.stages.map((s, i) => {
                  const prev = data.stages[i - 1];
                  const conv = prev && prev.count ? Math.round((s.count / prev.count) * 100) : null;
                  return {
                    label: s.name,
                    value: s.value,
                    caption: `${s.count} deal${s.count === 1 ? "" : "s"}${conv != null ? ` · ${conv}% from ${prev.name}` : ""}`,
                  };
                })}
                formatValue={money}
                emptyLabel="No open deals yet. Create a deal to start forecasting."
              />
            </InsightsCard>

            <InsightsCard title="Win / loss" description={`Deals closed in the last ${range} days.`}>
              <div className="grid grid-cols-3 gap-3 pb-4">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold text-emerald-600">{data.wonCount}</p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold text-destructive">{data.lostCount}</p>
                  <p className="text-xs text-muted-foreground">Lost</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold">{data.winRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Win rate</p>
                </div>
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Top loss reasons</p>
              {data.lostReasons.length
                ? data.lostReasons.map((r) => <CountRow key={r.reason} label={r.reason} value={r.count} tone="danger" />)
                : <EmptyHint>No lost deals in this period.</EmptyHint>}
            </InsightsCard>

            <InsightsCard title="Contact growth" description={`New contacts per week over the last ${range} days.`}>
              <BarList
                items={data.contactGrowth.map((w) => ({ label: weekLabel(w.label), value: w.count }))}
                emptyLabel="No new contacts captured in this period."
              />
            </InsightsCard>

            <InsightsCard title="Where contacts come from" description="Source and lifecycle split for new contacts.">
              <BarList
                items={data.contactsBySource.map((s) => ({ label: s.label, value: s.count }))}
                emptyLabel="No source data yet."
              />
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Lifecycle stage</p>
                {data.contactsByStage.length
                  ? data.contactsByStage.map((s) => <CountRow key={s.label} label={s.label} value={s.count} />)
                  : <EmptyHint>No contacts in this period.</EmptyHint>}
              </div>
            </InsightsCard>

            <InsightsCard
              title="Task health"
              description="Follow-up discipline across the team."
              action={<Button asChild variant="ghost" size="sm"><Link to="../tasks">Open tasks</Link></Button>}
            >
              <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-4">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold text-destructive">{data.tasks.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold text-amber-600">{data.tasks.dueToday}</p>
                  <p className="text-xs text-muted-foreground">Due today</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold">{data.tasks.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xl font-semibold text-emerald-600">{data.tasks.completedThisWeek}</p>
                  <p className="text-xs text-muted-foreground">Done this week</p>
                </div>
              </div>
              {data.tasksByOwner.length ? (
                <div className="space-y-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">By owner</p>
                  {data.tasksByOwner.map((t) => (
                    <div key={t.user_id ?? "unassigned"} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
                      <span className="truncate">{nameFor(t.user_id)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t.open} open{t.overdue ? ` · ${t.overdue} overdue` : ""}{t.done ? ` · ${t.done} done` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <EmptyHint>No tasks created yet.</EmptyHint>}
            </InsightsCard>

            <InsightsCard title="Activity leaderboard" description={`${data.totalActivities} activities logged in the last ${range} days.`}>
              <BarList
                items={data.activityLeaders.map((l) => ({
                  label: l.user_id ? nameFor(l.user_id) : l.label || "Automation",
                  value: l.count,
                }))}
                emptyLabel="No activity logged yet."
              />
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By type</p>
                {data.activityByType.length
                  ? data.activityByType.map((t) => <CountRow key={t.label} label={t.label.replace(/_/g, " ")} value={t.count} />)
                  : <EmptyHint>Nothing logged in this period.</EmptyHint>}
              </div>
            </InsightsCard>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            Insights are scoped to this workspace and refresh automatically as your team works.
            <AlarmClock className="ml-auto hidden h-4 w-4 shrink-0 sm:block" />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardCrmInsights;
