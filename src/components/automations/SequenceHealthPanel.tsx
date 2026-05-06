import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, RotateCcw, Clock, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
  const [emailKeyBroken, setEmailKeyBroken] = useState(false);
  const [emptySteps, setEmptySteps] = useState<number[]>([]);
  const [dismissedEmailAlert, setDismissedEmailAlert] = useState(false);
  const [dismissedStepsAlert, setDismissedStepsAlert] = useState(false);

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
      setEmailKeyBroken(hasAuthError);

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
      setEmptySteps(broken);
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

      {emailKeyBroken && (
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
        </div>
      )}

      {emptySteps.length > 0 && (
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
