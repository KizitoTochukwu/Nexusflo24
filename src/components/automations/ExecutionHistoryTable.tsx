import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceStrict } from "date-fns";
import {
  CheckCircle2, XCircle, Clock, DoorOpen, Wallet, Play, MoreHorizontal,
  RotateCcw, GitBranch, Tag, User, Folder, MousePointerClick, FileText, Zap, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AutomationLog } from "@/hooks/useAutomations";

type Props = {
  automationId: string;
  workspaceId: string;
  logs: AutomationLog[];
  stepsCount: number;
  leadLabelFor: (leadId: string | null) => string;
  onJumpToTimeline?: (leadId: string | null) => void;
  onOpenLead?: (leadId: string) => void;
};

type ScheduledJob = {
  id: string;
  automation_id: string | null;
  lead_id: string | null;
  step_index: number | null;
  status: string;
  run_at: string | null;
  payload: Record<string, any> | null;
  error: string | null;
  created_at: string;
};

type RunStatus = "completed" | "running" | "failed" | "exited" | "out_of_credits";

type Run = {
  key: string;
  leadId: string | null;
  startedAt: string;
  endedAt: string;
  entries: AutomationLog[];
  jobs: ScheduledJob[];
  status: RunStatus;
  durationMs: number | null;
  executedSteps: number;
  trigger: { key: string; label: string };
};

const PAGE_SIZE = 25;

export default function ExecutionHistoryTable({
  automationId, workspaceId, logs, stepsCount, leadLabelFor, onJumpToTimeline, onOpenLead,
}: Props) {
  const qc = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: ["automation-jobs", automationId],
    queryFn: async (): Promise<ScheduledJob[]> => {
      const { data, error } = await supabase
        .from("scheduled_jobs")
        .select("id, automation_id, lead_id, step_index, status, run_at, payload, error, created_at")
        .eq("automation_id", automationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ScheduledJob[];
    },
    enabled: !!automationId,
  });

  const runs = useMemo(() => buildRuns(logs, jobs ?? []), [logs, jobs]);
  const triggers = useMemo(() => Array.from(new Set(runs.map((r) => r.trigger.key))), [runs]);

  const [statusFilter, setStatusFilter] = useState<"all" | RunStatus>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (triggerFilter !== "all" && r.trigger.key !== triggerFilter) return false;
      if (q) {
        const label = leadLabelFor(r.leadId).toLowerCase();
        if (!label.includes(q)) return false;
      }
      return true;
    });
  }, [runs, statusFilter, triggerFilter, search, leadLabelFor]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  async function reTrigger(run: Run) {
    if (!run.leadId) { toast.error("Run has no lead to re-trigger"); return; }
    setBusyKey(run.key);
    try {
      const startStep = run.jobs.find((j) => j.status === "pending" || j.status === "failed")?.step_index;
      const { error } = await supabase.functions.invoke("execute-automation", {
        body: {
          automation_id: automationId,
          lead_id: run.leadId,
          workspace_id: workspaceId,
          ...(typeof startStep === "number" ? { start_from_step: startStep } : {}),
        },
      });
      if (error) throw error;
      toast.success("Re-triggered run");
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["automation-jobs", automationId] });
        qc.invalidateQueries({ queryKey: ["automation-logs", automationId] });
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Re-trigger failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function cancelPending(run: Run) {
    setBusyKey(run.key);
    try {
      const ids = run.jobs.filter((j) => j.status === "pending" || j.status === "running").map((j) => j.id);
      if (!ids.length) { toast.info("No pending jobs to cancel"); return; }
      const { error } = await supabase
        .from("scheduled_jobs")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      toast.success(`Cancelled ${ids.length} pending job(s)`);
      qc.invalidateQueries({ queryKey: ["automation-jobs", automationId] });
    } catch (e: any) {
      toast.error(e?.message || "Cancel failed");
    } finally {
      setBusyKey(null);
    }
  }

  if (!runs.length) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No runs yet. When a lead enters this automation, each run will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search lead…"
            className="h-8 w-48 pl-7 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="out_of_credits">Out of credits</SelectItem>
          </SelectContent>
        </Select>
        {triggers.length > 1 && (
          <Select value={triggerFilter} onValueChange={(v) => { setTriggerFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              {triggers.map((t) => (
                <SelectItem key={t} value={t}>{triggerLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} run{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((run) => {
              const progress = stepsCount > 0 ? Math.min(100, Math.round((run.executedSteps / stepsCount) * 100)) : 0;
              return (
                <TableRow
                  key={run.key}
                  className="cursor-pointer"
                  onClick={() => onJumpToTimeline?.(run.leadId)}
                >
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-1.5 max-w-[220px] truncate">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{leadLabelFor(run.leadId)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {format(new Date(run.startedAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {triggerIcon(run.trigger.key)}
                      {run.trigger.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <span className="tabular-nums text-muted-foreground">
                        {run.executedSteps}/{stepsCount || "?"}
                      </span>
                      {stepsCount > 0 && (
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              run.status === "failed" ? "bg-red-500" :
                              run.status === "exited" ? "bg-rose-400" :
                              run.status === "running" ? "bg-blue-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={run.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(run.durationMs, run.status)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyKey === run.key}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onJumpToTimeline?.(run.leadId)}>
                          <GitBranch className="mr-2 h-3.5 w-3.5" /> View timeline
                        </DropdownMenuItem>
                        {(run.status === "failed" || run.status === "exited" || run.status === "out_of_credits") && (
                          <DropdownMenuItem onClick={() => reTrigger(run)}>
                            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Re-trigger
                          </DropdownMenuItem>
                        )}
                        {run.status === "running" && (
                          <DropdownMenuItem onClick={() => cancelPending(run)}>
                            <DoorOpen className="mr-2 h-3.5 w-3.5" /> Cancel pending
                          </DropdownMenuItem>
                        )}
                        {run.leadId && onOpenLead && (
                          <DropdownMenuItem onClick={() => onOpenLead(run.leadId!)}>
                            <User className="mr-2 h-3.5 w-3.5" /> Open lead
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > visible.length && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Load more ({filtered.length - visible.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { cls: string; icon: JSX.Element; label: string }> = {
    completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed" },
    running: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Play className="h-3 w-3" />, label: "Running" },
    failed: { cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
    exited: { cls: "bg-rose-50 text-rose-700 border-rose-200", icon: <DoorOpen className="h-3 w-3" />, label: "Exited" },
    out_of_credits: { cls: "bg-amber-50 text-amber-800 border-amber-300", icon: <Wallet className="h-3 w-3" />, label: "Out of credits" },
  };
  const m = map[status];
  return <Badge variant="outline" className={cn("text-[10px] gap-1", m.cls)}>{m.icon}{m.label}</Badge>;
}

function formatDuration(ms: number | null, status: RunStatus): string {
  if (status === "running" || ms == null) return "—";
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return formatDistanceStrict(0, ms);
}

function triggerLabel(key: string): string {
  const map: Record<string, string> = {
    folder_trigger: "Folder added",
    tag_added: "Tag added",
    score_reached: "Score reached",
    form_submit: "Form submitted",
    webhook: "Webhook",
    manual: "Manual",
    re_trigger: "Re-triggered",
    simulate: "Simulated",
  };
  return map[key] || key.replace(/_/g, " ");
}

function triggerIcon(key: string): JSX.Element {
  if (key === "folder_trigger") return <Folder className="h-3 w-3" />;
  if (key === "tag_added") return <Tag className="h-3 w-3" />;
  if (key === "form_submit") return <FileText className="h-3 w-3" />;
  if (key === "score_reached") return <Zap className="h-3 w-3" />;
  if (key === "webhook") return <MousePointerClick className="h-3 w-3" />;
  return <Zap className="h-3 w-3" />;
}

/** Group logs into per-lead runs (gap > 12h starts a new run); summarize each. */
function buildRuns(logs: AutomationLog[], jobs: ScheduledJob[]): Run[] {
  const sorted = [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byLead = new Map<string, AutomationLog[]>();
  for (const l of sorted) {
    const k = l.lead_id || "__none__";
    if (!byLead.has(k)) byLead.set(k, []);
    byLead.get(k)!.push(l);
  }

  const runs: Run[] = [];
  for (const [leadKey, items] of byLead) {
    let bucket: AutomationLog[] = [];
    let prev: number | null = null;
    const flush = () => {
      if (!bucket.length) return;
      runs.push(toRun(leadKey, bucket, jobs));
      bucket = [];
    };
    for (const item of items) {
      const t = new Date(item.created_at).getTime();
      if (prev !== null && t - prev > 12 * 60 * 60 * 1000) flush();
      bucket.push(item);
      prev = t;
    }
    flush();
  }
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function toRun(leadKey: string, entries: AutomationLog[], allJobs: ScheduledJob[]): Run {
  const leadId = leadKey === "__none__" ? null : leadKey;
  const startedAt = entries[0].created_at;
  const endedAt = entries[entries.length - 1].created_at;
  const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();

  // Jobs belonging to this lead within or after this run window.
  const runStart = new Date(startedAt).getTime();
  const runJobs = allJobs.filter((j) => {
    if (j.lead_id !== leadId) return false;
    const created = new Date(j.created_at).getTime();
    return created >= runStart - 60_000; // small grace
  });

  // Status rollup
  const hasInsufficient = entries.some((e) => e.status === "insufficient_credits");
  const hasExit = entries.some((e) => e.event_type.startsWith("exit_criteria:") || e.status === "cancelled");
  const hasFailed = entries.some((e) => e.status === "failed" || e.status === "error")
    || runJobs.some((j) => j.status === "failed");
  const hasPending = runJobs.some((j) => j.status === "pending" || j.status === "running");

  let status: RunStatus = "completed";
  if (hasPending) status = "running";
  else if (hasFailed) status = "failed";
  else if (hasInsufficient) status = "out_of_credits";
  else if (hasExit) status = "exited";

  // Executed step count = distinct step indices that produced action/condition/delay events
  const stepKeys = new Set<string>();
  for (const e of entries) {
    if (e.event_type.startsWith("action:") || e.event_type.startsWith("condition:") || e.event_type.startsWith("delay:")) {
      const idx = (e.details as any)?.step_index;
      stepKeys.add(String(idx ?? e.event_type + "@" + e.created_at));
    }
  }

  // Trigger derivation: prefer originating scheduled_job payload.source, else first log event.
  const originJob = runJobs
    .filter((j) => (j.step_index ?? 0) === 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const sourceFromJob = (originJob?.payload as any)?.source as string | undefined;
  let triggerKey = sourceFromJob || "manual";
  if (!sourceFromJob) {
    const first = entries[0];
    if (first?.event_type === "trigger:simulate") triggerKey = "simulate";
    else if (first?.event_type?.startsWith("trigger:")) triggerKey = first.event_type.replace("trigger:", "");
  }

  return {
    key: `${leadKey}-${entries[0].id}`,
    leadId,
    startedAt,
    endedAt,
    entries,
    jobs: runJobs,
    status,
    durationMs: status === "running" ? null : durationMs,
    executedSteps: stepKeys.size,
    trigger: { key: triggerKey, label: triggerLabel(triggerKey) },
  };
}
