import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, DoorOpen, GitBranch, ChevronRight, ChevronDown, User, Wallet, SkipForward } from "lucide-react";
import { format } from "date-fns";
import type { AutomationLog } from "@/hooks/useAutomations";
import { cn } from "@/lib/utils";

type Props = {
  logs: AutomationLog[];
  leadLabelFor?: (leadId: string | null) => string;
};

type TimelineRow = {
  log: AutomationLog;
  depth: number;
  branchKind: "yes" | "no" | null;
  isBranchMarker: "start" | "end" | null;
  inSkippedBranch: boolean;
};

/**
 * Groups raw automation_logs into per-lead "runs" and lays them out as a
 * branch-aware timeline. Branch markers (`branch:yes_start` etc.) act as
 * indentation pushes/pops so the visual hierarchy mirrors the YES/NO forks
 * in the workflow definition. Steps inside a skipped branch are rendered
 * dimmed and labelled so it's obvious which path the lead actually walked.
 */
export default function ExecutionTimeline({ logs, leadLabelFor }: Props) {
  const runs = useMemo(() => groupByRun(logs), [logs]);
  const [openRuns, setOpenRuns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    runs.slice(0, 3).forEach((r) => { init[r.key] = true; });
    return init;
  });

  if (!runs.length) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        No execution timeline yet. Once a lead enters this automation, you'll see the YES/NO branches they took here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const open = openRuns[run.key] ?? false;
        const rows = open ? layoutRows(run.entries) : [];
        return (
          <div key={run.key} className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              onClick={() => setOpenRuns((s) => ({ ...s, [run.key]: !s[run.key] }))}
            >
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm truncate">
                {leadLabelFor?.(run.leadId) || (run.leadId ? `Lead ${run.leadId.slice(0, 8)}` : "No lead")}
              </span>
              <span className="text-xs text-muted-foreground">
                · {format(new Date(run.startedAt), "MMM d, HH:mm")}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {run.tookYes && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]"><GitBranch className="h-3 w-3" /> YES path</Badge>}
                {run.tookNo && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[10px]"><GitBranch className="h-3 w-3" /> NO path</Badge>}
                <Badge variant="outline" className="text-[10px]">{run.entries.length} events</Badge>
              </div>
            </button>

            {open && (
              <div className="border-t border-border bg-muted/20 px-2 py-2 space-y-1">
                {rows.map((row) => (
                  <TimelineRowView key={row.log.id} row={row} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineRowView({ row }: { row: TimelineRow }) {
  const { log, depth, branchKind, isBranchMarker, inSkippedBranch } = row;

  if (isBranchMarker === "start") {
    const kind = branchKind!;
    const skipped = log.status === "branch_skipped";
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium"
        style={{ marginLeft: depth * 20 }}
      >
        <GitBranch className={cn("h-3.5 w-3.5", kind === "yes" ? "text-emerald-600" : "text-rose-600")} />
        <span className={cn(kind === "yes" ? "text-emerald-700" : "text-rose-700")}>
          If {kind.toUpperCase()} — {skipped ? "branch skipped" : "branch entered"}
        </span>
        {(log.details as any)?.reason && (
          <span className="text-muted-foreground font-normal italic truncate">
            ({(log.details as any).reason})
          </span>
        )}
      </div>
    );
  }
  if (isBranchMarker === "end") {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground border-l-2 border-dashed border-border ml-1"
        style={{ marginLeft: depth * 20 }}
      >
        <span>End {branchKind?.toUpperCase()} branch</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-2 py-1.5 rounded-md border-l-2",
        branchKind === "yes" && "border-emerald-300 bg-emerald-50/30",
        branchKind === "no" && "border-rose-300 bg-rose-50/30",
        !branchKind && "border-transparent",
        inSkippedBranch && "opacity-50",
      )}
      style={{ marginLeft: depth * 20 }}
    >
      <StatusIcon status={log.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium truncate">{log.event_type}</span>
          <StatusBadge status={log.status} details={log.details} />
        </div>
        {renderDetails(log) && (
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{renderDetails(log)}</div>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {format(new Date(log.created_at), "HH:mm:ss")}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success" || status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />;
  if (status === "scheduled") return <Clock className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />;
  if (status === "skipped" || status === "branch_skipped") return <SkipForward className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />;
  if (status === "cancelled") return <DoorOpen className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />;
  if (status === "insufficient_credits") return <Wallet className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />;
}

function StatusBadge({ status, details }: { status: string; details: Record<string, unknown> }) {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    skipped: "bg-muted text-muted-foreground border-border",
    branch_skipped: "bg-muted text-muted-foreground border-border",
    branch_entered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    insufficient_credits: "bg-amber-50 text-amber-800 border-amber-300",
    failed: "bg-red-50 text-red-700 border-red-200",
    error: "bg-red-50 text-red-700 border-red-200",
    condition_failed: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const cls = map[status] || "bg-muted text-muted-foreground border-border";
  let label = status.replace(/_/g, " ");
  if (status === "insufficient_credits") {
    const ch = (details as any)?.channel;
    label = ch ? `out of ${ch} credits` : "out of credits";
  }
  return <Badge variant="outline" className={cn("text-[10px]", cls)}>{label}</Badge>;
}

function renderDetails(log: AutomationLog): string | null {
  const d = log.details as any;
  if (!d || typeof d !== "object") return null;
  if (typeof d.reason === "string") return d.reason;
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  return null;
}

// ---------------- helpers ----------------

type Run = {
  key: string;
  leadId: string | null;
  startedAt: string;
  entries: AutomationLog[];
  tookYes: boolean;
  tookNo: boolean;
};

/** Groups logs by lead + run window (gaps > 12h start a new run). */
function groupByRun(logs: AutomationLog[]): Run[] {
  // Sort ascending then group sequentially per lead.
  const sorted = [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byLead = new Map<string, AutomationLog[]>();
  for (const l of sorted) {
    const key = l.lead_id || "__none__";
    if (!byLead.has(key)) byLead.set(key, []);
    byLead.get(key)!.push(l);
  }
  const runs: Run[] = [];
  for (const [leadKey, items] of byLead) {
    let bucket: AutomationLog[] = [];
    let prev: number | null = null;
    for (const item of items) {
      const t = new Date(item.created_at).getTime();
      if (prev !== null && t - prev > 12 * 60 * 60 * 1000) {
        if (bucket.length) runs.push(toRun(leadKey, bucket));
        bucket = [];
      }
      bucket.push(item);
      prev = t;
    }
    if (bucket.length) runs.push(toRun(leadKey, bucket));
  }
  // Newest run first
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function toRun(leadKey: string, entries: AutomationLog[]): Run {
  const tookYes = entries.some((e) => e.event_type === "branch:yes_start" && e.status === "branch_entered");
  const tookNo = entries.some((e) => e.event_type === "branch:no_start" && e.status === "branch_entered");
  return {
    key: `${leadKey}-${entries[0].id}`,
    leadId: leadKey === "__none__" ? null : leadKey,
    startedAt: entries[0].created_at,
    entries,
    tookYes,
    tookNo,
  };
}

/** Walks a run's entries and assigns indentation depth + branch context. */
function layoutRows(entries: AutomationLog[]): TimelineRow[] {
  const stack: { kind: "yes" | "no"; skipped: boolean }[] = [];
  const rows: TimelineRow[] = [];
  for (const log of entries) {
    const ev = log.event_type;
    if (ev === "branch:yes_start" || ev === "branch:no_start") {
      const kind = ev === "branch:yes_start" ? "yes" : "no";
      const skipped = log.status === "branch_skipped";
      rows.push({
        log,
        depth: stack.length,
        branchKind: kind,
        isBranchMarker: "start",
        inSkippedBranch: stack.some((s) => s.skipped),
      });
      stack.push({ kind, skipped });
      continue;
    }
    if (ev === "branch:yes_end" || ev === "branch:no_end") {
      const kind = ev === "branch:yes_end" ? "yes" : "no";
      // Pop matching frame
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].kind === kind) { stack.splice(i, 1); break; }
      }
      rows.push({
        log,
        depth: stack.length,
        branchKind: kind,
        isBranchMarker: "end",
        inSkippedBranch: stack.some((s) => s.skipped),
      });
      continue;
    }
    const top = stack[stack.length - 1];
    rows.push({
      log,
      depth: stack.length,
      branchKind: top?.kind ?? null,
      isBranchMarker: null,
      inSkippedBranch: stack.some((s) => s.skipped),
    });
  }
  return rows;
}
