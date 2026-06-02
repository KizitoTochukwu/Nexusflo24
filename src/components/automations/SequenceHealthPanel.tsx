import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, RotateCcw, Clock, CheckCircle2, AlertTriangle, X, Activity, Wrench, Zap } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Health thresholds — tweak here to tune sensitivity
const THRESHOLDS = {
  failureRate: { warn: 10, crit: 25 }, // % of recent logs that failed (24h)
  overdueMinutes: { warn: 15, crit: 60 }, // pending job past run_at
  stuckCount: { warn: 1, crit: 5 }, // failed + stuck rows
  queueBacklog: { warn: 25, crit: 100 }, // queued jobs
};

type Severity = "ok" | "warn" | "crit";
function sevFromCount(n: number, t: { warn: number; crit: number }): Severity {
  if (n >= t.crit) return "crit";
  if (n >= t.warn) return "warn";
  return "ok";
}

interface Props {
  automationId: string;
  workspaceId: string;
}

interface RowData {
  lead_id: string;
  lead_name: string;
  lead_email: string | null;
  next_step_index: number | null;
  next_run_at: string | null;
  job_status: string | null;
  job_id: string | null;
  job_error: string | null;
  last_log_event: string | null;
  last_log_status: string | null;
  last_log_at: string | null;
}

export default function SequenceHealthPanel({ automationId, workspaceId }: Props) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [retriggering, setRetriggering] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [emailKeyBroken, setEmailKeyBroken] = useState(false);
  const [emptySteps, setEmptySteps] = useState<number[]>([]);
  const [dismissedEmailAlert, setDismissedEmailAlert] = useState(false);
  const [dismissedStepsAlert, setDismissedStepsAlert] = useState(false);
  const [recentStats, setRecentStats] = useState<{ total: number; failed: number }>({ total: 0, failed: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pull recent logs to figure out which leads are enrolled in this automation
      const { data: logs } = await supabase
        .from("automation_logs")
        .select("lead_id, event_type, status, created_at, details")
        .eq("automation_id", automationId)
        .not("lead_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      // Detect provider auth errors in recent logs (last 24h)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const hasAuthError = (logs || []).some((l: any) => {
        const t = new Date(l.created_at).getTime();
        return t > dayAgo && l?.details?.provider_auth_error === true;
      });
      setEmailKeyBroken((prev) => {
        if (prev !== hasAuthError) setDismissedEmailAlert(false);
        return hasAuthError;
      });

      // Failure rate over last 24h (excludes scheduled/branch markers)
      const recent24 = (logs || []).filter((l: any) => new Date(l.created_at).getTime() > dayAgo);
      const countable = recent24.filter((l: any) =>
        ["success", "completed", "failed", "error", "insufficient_credits"].includes(l.status)
      );
      const failedCount = countable.filter((l: any) =>
        ["failed", "error", "insufficient_credits"].includes(l.status)
      ).length;
      setRecentStats({ total: countable.length, failed: failedCount });

      const leadIdsSet = new Set<string>();
      const lastByLead: Record<string, { event_type: string; status: string; created_at: string }> = {};
      for (const l of logs || []) {
        if (!l.lead_id) continue;
        leadIdsSet.add(l.lead_id);
        if (!lastByLead[l.lead_id]) {
          lastByLead[l.lead_id] = {
            event_type: l.event_type,
            status: l.status,
            created_at: l.created_at,
          };
        }
      }

      const leadIds = Array.from(leadIdsSet);
      if (leadIds.length === 0) {
        setRows([]);
        return;
      }

      // Pull leads info
      const { data: leads } = await supabase
        .from("leads")
        .select("id, full_name, email")
        .in("id", leadIds);

      const leadMap: Record<string, { name: string; email: string | null }> = {};
      for (const ld of (leads as any[]) || []) {
        const name =
          (ld.full_name && String(ld.full_name).trim()) ||
          ld.email ||
          String(ld.id).slice(0, 8);
        leadMap[ld.id] = { name, email: ld.email ?? null };
      }

      // Pull pending scheduled jobs
      const { data: jobs } = await supabase
        .from("scheduled_jobs")
        .select("id, lead_id, step_index, run_at, status, error")
        .eq("automation_id", automationId)
        .in("lead_id", leadIds)
        .in("status", ["pending", "running", "failed"])
        .order("run_at", { ascending: true });

      const jobByLead: Record<string, any> = {};
      for (const j of jobs || []) {
        if (!j.lead_id) continue;
        // Keep the soonest pending/running, otherwise the failed one
        if (!jobByLead[j.lead_id] || j.status === "pending" || j.status === "running") {
          jobByLead[j.lead_id] = j;
        }
      }

      const built: RowData[] = leadIds.map((lid) => {
        const ld = leadMap[lid] || { name: lid.slice(0, 8), email: null };
        const j = jobByLead[lid];
        const last = lastByLead[lid];
        return {
          lead_id: lid,
          lead_name: ld.name,
          lead_email: ld.email,
          next_step_index: j?.step_index ?? null,
          next_run_at: j?.run_at ?? null,
          job_status: j?.status ?? null,
          job_id: j?.id ?? null,
          job_error: j?.error ?? null,
          last_log_event: last?.event_type ?? null,
          last_log_status: last?.status ?? null,
          last_log_at: last?.created_at ?? null,
        };
      });

      // Sort: failed first, then pending soonest, then no-job rows
      built.sort((a, b) => {
        const score = (r: RowData) =>
          r.job_status === "failed" ? 0 :
          r.job_status === "pending" || r.job_status === "running" ? 1 :
          2;
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        if (a.next_run_at && b.next_run_at) return a.next_run_at.localeCompare(b.next_run_at);
        return (b.last_log_at || "").localeCompare(a.last_log_at || "");
      });

      setRows(built);
    } catch (e: any) {
      console.error("[SequenceHealth] load error:", e);
      toast.error(e?.message || "Failed to load sequence health");
    } finally {
      setLoading(false);
    }
  }, [automationId]);

  useEffect(() => {
    load();
  }, [load]);

  // Detect broken steps (action steps with no `action` configured)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: steps } = await supabase
        .from("automation_steps")
        .select("step_order, step_type, config")
        .eq("automation_id", automationId)
        .order("step_order", { ascending: true });
      if (cancelled) return;
      const broken = (steps || [])
        .filter((s: any) => {
          if (s.step_type !== "action") return false;
          const cfg = (s.config || {}) as any;
          return !cfg.action && !cfg.action_type && !cfg.channel;
        })
        .map((s: any) => s.step_order as number);
      setEmptySteps((prev) => {
        const same = prev.length === broken.length && prev.every((v, i) => v === broken[i]);
        if (!same) setDismissedStepsAlert(false);
        return broken;
      });
    })();
    return () => { cancelled = true; };
  }, [automationId]);

  const reTrigger = async (row: RowData) => {
    setRetriggering(row.lead_id);
    try {
      const stepArg = row.next_step_index ?? undefined;
      const { error } = await supabase.functions.invoke("execute-automation", {
        body: {
          automation_id: automationId,
          workspace_id: workspaceId,
          lead_id: row.lead_id,
          ...(stepArg !== undefined ? { start_from_step: stepArg } : {}),
        },
      });
      if (error) throw error;
      toast.success(`Re-triggered for ${row.lead_name}`);
      setTimeout(load, 1000);
    } catch (e: any) {
      toast.error(e?.message || "Re-trigger failed");
    } finally {
      setRetriggering(null);
    }
  };

  const metrics = useMemo(() => {
    const now = Date.now();
    let queued = 0, failed = 0, stuck = 0, overdueWarn = 0, overdueCrit = 0, maxOverdueMin = 0;
    for (const r of rows) {
      if (r.job_status === "pending" || r.job_status === "running") queued++;
      if (r.job_status === "failed") failed++;
      const isStuck = r.job_status === "failed" || (!r.job_status && r.last_log_event?.includes("delay"));
      if (isStuck) stuck++;
      if (r.next_run_at && (r.job_status === "pending" || r.job_status === "running")) {
        const lateMin = (now - new Date(r.next_run_at).getTime()) / 60000;
        if (lateMin >= THRESHOLDS.overdueMinutes.crit) overdueCrit++;
        else if (lateMin >= THRESHOLDS.overdueMinutes.warn) overdueWarn++;
        if (lateMin > maxOverdueMin) maxOverdueMin = lateMin;
      }
    }
    const failureRate = recentStats.total > 0 ? (recentStats.failed / recentStats.total) * 100 : 0;
    const overdue = overdueWarn + overdueCrit;
    const stuckSev = sevFromCount(stuck, THRESHOLDS.stuckCount);
    const queueSev = sevFromCount(queued, THRESHOLDS.queueBacklog);
    const overdueSev: Severity = overdueCrit > 0 ? "crit" : overdueWarn > 0 ? "warn" : "ok";
    const failSev: Severity =
      failureRate >= THRESHOLDS.failureRate.crit ? "crit" :
      failureRate >= THRESHOLDS.failureRate.warn ? "warn" : "ok";
    const overall: Severity =
      [stuckSev, queueSev, overdueSev, failSev].includes("crit") ? "crit" :
      [stuckSev, queueSev, overdueSev, failSev].includes("warn") ? "warn" : "ok";

    const recs: { id: string; sev: Severity; title: string; body: string }[] = [];
    if (failSev !== "ok") {
      recs.push({
        id: "fail-rate",
        sev: failSev,
        title: `${failureRate.toFixed(0)}% of recent steps failed (24h)`,
        body: emailKeyBroken
          ? "Most failures are from an invalid email API key — fix Settings → Channels → Email first, then re-trigger affected leads."
          : "Open the Logs tab, group by error, and fix the root cause (missing template, low credits, invalid channel). Then use 'Re-trigger all stuck'.",
      });
    }
    if (stuckSev !== "ok") {
      recs.push({
        id: "stuck",
        sev: stuckSev,
        title: `${stuck} lead${stuck === 1 ? "" : "s"} stuck`,
        body: "Click 'Re-trigger all stuck' below to push these leads to their next step. If the same leads keep failing, check the step's configuration.",
      });
    }
    if (overdueSev !== "ok") {
      recs.push({
        id: "overdue",
        sev: overdueSev,
        title: `${overdue} job${overdue === 1 ? "" : "s"} overdue (max ${Math.round(maxOverdueMin)} min late)`,
        body: "The scheduler may be backed up. Refresh in 1–2 minutes; if jobs are still overdue, re-trigger them manually.",
      });
    }
    if (queueSev !== "ok") {
      recs.push({
        id: "queue",
        sev: queueSev,
        title: `${queued} queued jobs`,
        body: "Large queues are usually fine, but check that delay steps aren't longer than intended.",
      });
    }
    if (emptySteps.length > 0) {
      recs.push({
        id: "empty",
        sev: "warn",
        title: `${emptySteps.length} step${emptySteps.length === 1 ? "" : "s"} have no action configured`,
        body: `Open the editor and configure step${emptySteps.length === 1 ? "" : "s"} #${emptySteps.map((n) => n + 1).join(", #")} — they will be skipped at runtime.`,
      });
    }

    return { queued, failed, stuck, overdue, maxOverdueMin, failureRate, overall, stuckSev, queueSev, overdueSev, failSev, recs };
  }, [rows, recentStats, emailKeyBroken, emptySteps]);

  const stuckRows = useMemo(
    () => rows.filter((r) => r.job_status === "failed" || (!r.job_status && r.last_log_event?.includes("delay"))),
    [rows]
  );

  const reTriggerAllStuck = async () => {
    if (stuckRows.length === 0) return;
    setBulkRunning(true);
    let ok = 0, fail = 0;
    for (const r of stuckRows) {
      try {
        const stepArg = r.next_step_index ?? undefined;
        const { error } = await supabase.functions.invoke("execute-automation", {
          body: {
            automation_id: automationId,
            workspace_id: workspaceId,
            lead_id: r.lead_id,
            ...(stepArg !== undefined ? { start_from_step: stepArg } : {}),
          },
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkRunning(false);
    if (fail === 0) toast.success(`Re-triggered ${ok} lead${ok === 1 ? "" : "s"}`);
    else toast.warning(`Re-triggered ${ok}, ${fail} failed`);
    setTimeout(load, 1200);
  };


  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sequence Health</h3>
          <p className="text-xs text-muted-foreground">
            Live view of leads currently in this automation. Use "Re-trigger" to recover any stuck lead.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Health summary with thresholds */}
      <div className={cn(
        "rounded-lg border p-3",
        metrics.overall === "crit" && "border-destructive/40 bg-destructive/5",
        metrics.overall === "warn" && "border-amber-400/40 bg-amber-50 dark:bg-amber-950/20",
        metrics.overall === "ok" && "border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/20",
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Activity className={cn(
            "h-4 w-4",
            metrics.overall === "crit" && "text-destructive",
            metrics.overall === "warn" && "text-amber-600",
            metrics.overall === "ok" && "text-emerald-600",
          )} />
          <span className="text-sm font-semibold">
            {metrics.overall === "ok" && "All systems healthy"}
            {metrics.overall === "warn" && "Needs attention"}
            {metrics.overall === "crit" && "Action required"}
          </span>
          {stuckRows.length > 0 && (
            <Button
              size="sm"
              variant={metrics.overall === "crit" ? "default" : "outline"}
              className="ml-auto h-7"
              disabled={bulkRunning}
              onClick={reTriggerAllStuck}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {bulkRunning ? "Re-triggering…" : `Re-trigger all stuck (${stuckRows.length})`}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="Stuck / failed" value={metrics.stuck} sev={metrics.stuckSev}
            hint={`warn ≥${THRESHOLDS.stuckCount.warn} · crit ≥${THRESHOLDS.stuckCount.crit}`} />
          <MetricCard label="Failure rate (24h)" value={`${metrics.failureRate.toFixed(0)}%`} sev={metrics.failSev}
            hint={`warn ≥${THRESHOLDS.failureRate.warn}% · crit ≥${THRESHOLDS.failureRate.crit}%`} />
          <MetricCard label="Overdue jobs" value={metrics.overdue} sev={metrics.overdueSev}
            hint={`>${THRESHOLDS.overdueMinutes.warn}m late = warn`} />
          <MetricCard label="Queued" value={metrics.queued} sev={metrics.queueSev}
            hint={`warn ≥${THRESHOLDS.queueBacklog.warn} · crit ≥${THRESHOLDS.queueBacklog.crit}`} />
        </div>

        {metrics.recs.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {metrics.recs.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs">
                <Wrench className={cn(
                  "h-3.5 w-3.5 mt-0.5 shrink-0",
                  r.sev === "crit" && "text-destructive",
                  r.sev === "warn" && "text-amber-600",
                  r.sev === "ok" && "text-emerald-600",
                )} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-muted-foreground">{r.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {emailKeyBroken && !dismissedEmailAlert && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-destructive">
              Email sending is paused — invalid Resend API key
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your automation is running, but every email step is failing because the Resend API key is invalid.
              Open <strong>Settings → Channels → Email</strong> and paste a valid key to resume sending.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedEmailAlert(true)}
            aria-label="Dismiss alert"
            title="Dismiss — I've fixed this"
            className="shrink-0 -mt-1 -mr-1 h-7 w-7 inline-flex items-center justify-center rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {emptySteps.length > 0 && !dismissedStepsAlert && (
        <div className="rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {emptySteps.length === 1 ? "1 step needs configuration" : `${emptySteps.length} steps need configuration`}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step{emptySteps.length > 1 ? "s" : ""} #{emptySteps.map((n) => n + 1).join(", #")} ha{emptySteps.length > 1 ? "ve" : "s"} no action selected and will be skipped.
              Open the automation editor to pick an action (email, SMS, WhatsApp, tag, etc.) or delete the step.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedStepsAlert(true)}
            aria-label="Dismiss alert"
            title="Dismiss — I've fixed this"
            className="shrink-0 -mt-1 -mr-1 h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-700/70 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
          No leads have entered this automation yet.
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {rows.map((r) => {
            const isStuck = r.job_status === "failed" || (!r.job_status && r.last_log_event?.includes("delay"));
            const isPending = r.job_status === "pending" || r.job_status === "running";
            return (
              <div key={r.lead_id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.lead_name}</div>
                  {r.lead_email && (
                    <div className="text-xs text-muted-foreground truncate">{r.lead_email}</div>
                  )}
                </div>

                <div className="flex flex-col items-start gap-1 min-w-[140px]">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wide">Next step</span>
                  {r.next_run_at ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>
                        Step #{(r.next_step_index ?? 0) + 1} ·{" "}
                        {new Date(r.next_run_at) > new Date()
                          ? `in ${formatDistanceToNow(new Date(r.next_run_at))}`
                          : `${formatDistanceToNow(new Date(r.next_run_at))} ago`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {r.next_run_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(r.next_run_at), "MMM d, HH:mm")}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-start gap-1 min-w-[110px]">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wide">Status</span>
                  {isPending && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> Queued
                    </Badge>
                  )}
                  {r.job_status === "failed" && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Failed
                    </Badge>
                  )}
                  {!r.job_status && !isStuck && (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </Badge>
                  )}
                  {!r.job_status && isStuck && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Stuck
                    </Badge>
                  )}
                  {r.job_error && (
                    <span className="text-[10px] text-destructive truncate max-w-[160px]" title={r.job_error}>
                      {r.job_error}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isStuck ? "default" : "outline"}
                  disabled={retriggering === r.lead_id}
                  onClick={() => reTrigger(r)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {retriggering === r.lead_id ? "Re-triggering…" : "Re-trigger"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sev, hint }: { label: string; value: number | string; sev: Severity; hint: string }) {
  return (
    <div className={cn(
      "rounded-md border bg-background/60 p-2",
      sev === "crit" && "border-destructive/40",
      sev === "warn" && "border-amber-400/40",
      sev === "ok" && "border-border",
    )}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn(
        "text-lg font-semibold tabular-nums",
        sev === "crit" && "text-destructive",
        sev === "warn" && "text-amber-700 dark:text-amber-400",
      )}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
