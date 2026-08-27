import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  usePlatformAction, usePlatformAutomationHealth, usePlatformFailedRuns,
} from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PlatformAutomations() {
  const health = usePlatformAutomationHealth(30);
  const failedRuns = usePlatformFailedRuns(50);
  const action = usePlatformAction();
  const [retry, setRetry] = useState<any | null>(null);

  const h = health.data as any;

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Cross-workspace automation and workflow health over the last 30 days."
      />

      {health.isLoading ? (
        <LoadingBlock rows={3} />
      ) : health.error ? (
        <ErrorBlock error={health.error} onRetry={() => health.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Failed step runs" value={h?.failed_runs ?? 0} tone={h?.failed_runs > 0 ? "warning" : "default"} hint="Workflow steps that errored" />
          <StatCard label="Failed automation events" value={h?.failed_automation_logs ?? 0} tone={h?.failed_automation_logs > 0 ? "warning" : "default"} hint="Legacy automation engine failures" />
          <StatCard label="Stuck enrollments" value={h?.stuck_enrollments ?? 0} tone={h?.stuck_enrollments > 0 ? "warning" : "default"} hint="Active, no step in 24h, nothing scheduled" />
          <StatCard label="Pending jobs" value={h?.pending_jobs ?? 0} hint="Scheduled steps waiting to run" />
          <StatCard label="Overdue jobs" value={h?.overdue_jobs ?? 0} tone={h?.overdue_jobs > 0 ? "warning" : "default"} hint="Pending past their run time" />
          <StatCard label="Failed jobs" value={h?.failed_jobs ?? 0} tone={h?.failed_jobs > 0 ? "warning" : "default"} hint="Scheduled jobs that errored" />
        </div>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Failed run queue</CardTitle>
          <CardDescription>
            Retry re-enters the workflow engine from the failed step. Retries are idempotent — already-processed events are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failedRuns.isLoading ? (
            <LoadingBlock rows={3} />
          ) : failedRuns.error ? (
            <ErrorBlock error={failedRuns.error} onRetry={() => failedRuns.refetch()} />
          ) : !(failedRuns.data as any[])?.length ? (
            <EmptyBlock title="No failed runs" description="Every workflow step has completed cleanly." />
          ) : (
            <ul className="divide-y text-sm">
              {(failedRuns.data as any[]).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.workflow_name ?? "Unnamed workflow"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{r.workspace_name ?? ""}</span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {format(new Date(r.ran_at), "MMM d, HH:mm")} · {r.node_type}
                      {r.error ? ` · ${String(r.error).slice(0, 120)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.enrollment_status ?? "unknown"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setRetry(r)} disabled={!r.enrollment_id}>
                      Retry
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <HighRiskActionDialog
        open={!!retry}
        onOpenChange={(v) => !v && setRetry(null)}
        title="Retry failed workflow run"
        description={`Re-run "${retry?.workflow_name ?? "workflow"}" from the failed step for this enrollment.`}
        confirmLabel="Retry now"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "retry_workflow_run", reason, payload: { run_id: retry.id } },
            {
              onSuccess: () => {
                toast.success("Run retried");
                setRetry(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}
