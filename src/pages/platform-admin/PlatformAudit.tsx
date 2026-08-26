import { useState } from "react";
import { usePlatformAuditLogs } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PlatformAudit() {
  const { data, isLoading, error, refetch } = usePlatformAuditLogs(200);
  const [q, setQ] = useState("");

  const rows = (data ?? []).filter(
    (r: any) =>
      !q ||
      r.action?.toLowerCase().includes(q.toLowerCase()) ||
      r.entity_id?.toLowerCase?.().includes(q.toLowerCase()) ||
      r.reason?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Append-only record of every platform admin action, including actor, target, reason and result."
      />

      <Card>
        <CardContent className="pt-5">
          <Input
            className="mb-4 max-w-sm"
            placeholder="Filter by action, target or reason..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {isLoading ? (
            <LoadingBlock rows={6} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !rows.length ? (
            <EmptyBlock title="No audit entries" description="Actions performed from Platform Admin appear here." />
          ) : (
            <ul className="divide-y">
              {rows.map((r: any) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.result === "success" ? "default" : "destructive"}>{r.action}</Badge>
                    {r.entity_type && (
                      <span className="text-xs text-muted-foreground">
                        {r.entity_type}: {r.entity_id}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm">{r.reason}</p>}
                  {(r.before_summary || r.after_summary) && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(r.before_summary)} → {JSON.stringify(r.after_summary)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
