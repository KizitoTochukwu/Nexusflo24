import { format } from "date-fns";
import { usePlatformHealthJobs } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock, NotConfigured,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlatformHealth() {
  const jobs = usePlatformHealthJobs();
  const j = jobs.data as any;

  return (
    <div>
      <PageHeader
        title="Platform Health"
        description="Scheduler, queue and infrastructure signals. Metrics that aren't instrumented are labelled honestly."
      />

      {jobs.isLoading ? (
        <LoadingBlock rows={3} />
      ) : jobs.error ? (
        <ErrorBlock error={jobs.error} onRetry={() => jobs.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Pending jobs" value={j?.pending_jobs ?? 0} />
          <StatCard label="Overdue jobs" value={j?.overdue_jobs ?? 0} tone={j?.overdue_jobs > 0 ? "warning" : "default"} />
          <StatCard label="Failed jobs (7d)" value={j?.failed_jobs_7d ?? 0} tone={j?.failed_jobs_7d > 0 ? "warning" : "default"} />
          <StatCard label="Queued emails" value={j?.queued_emails ?? 0} hint={j?.oldest_queued_email_at ? `Oldest: ${format(new Date(j.oldest_queued_email_at), "MMM d, HH:mm")}` : "Queue empty"} />
          <StatCard label="Jobs completed (7d)" value={j?.completed_jobs_7d ?? 0} />
        </div>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent failed jobs</CardTitle>
          <CardDescription>Scheduled jobs that errored, most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.isLoading ? (
            <LoadingBlock rows={2} />
          ) : !(j?.recent_failed_jobs ?? []).length ? (
            <EmptyBlock title="No failed jobs" description="The scheduler is running cleanly." />
          ) : (
            <ul className="divide-y text-sm">
              {(j.recent_failed_jobs as any[]).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.job_type}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {format(new Date(f.updated_at), "MMM d, HH:mm")} · {f.attempts} attempt{f.attempts === 1 ? "" : "s"}
                      {f.last_error ? ` · ${String(f.last_error).slice(0, 140)}` : ""}
                    </p>
                  </div>
                  <Badge variant="destructive">failed</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <NotConfigured
          title="Edge function error rates"
          description="Per-function latency and error-rate charts are not tracked by this build. Function logs remain available in the backend function logs."
        />
        <NotConfigured
          title="Database performance"
          description="Slow-query and connection-pool metrics are not tracked here yet. The platform overview surfaces row-level growth signals instead."
        />
      </div>
    </div>
  );
}
