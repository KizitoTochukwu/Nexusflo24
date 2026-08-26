import { toast } from "sonner";
import { usePlatformAction, useSupportSessions } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PlatformSupport() {
  const { data, isLoading, error, refetch } = useSupportSessions();
  const action = usePlatformAction();

  return (
    <div>
      <PageHeader
        title="Support Access"
        description="Time-limited, reason-tagged support sessions. Start a session from the Workspaces screen."
      />

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingBlock rows={4} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !data?.length ? (
            <EmptyBlock title="No support sessions recorded" />
          ) : (
            <ul className="divide-y">
              {data.map((s: any) => {
                const expired = new Date(s.expires_at) < new Date();
                const active = !s.ended_at && !expired;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs">{s.workspace_id}</p>
                      <p className="text-sm">{s.reason}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Started {new Date(s.created_at).toLocaleString("en-GB")} · expires{" "}
                        {new Date(s.expires_at).toLocaleString("en-GB")}
                        {s.read_only ? " · read-only" : ""}
                      </p>
                    </div>
                    <Badge variant={active ? "default" : "secondary"}>
                      {s.ended_at ? "Ended" : expired ? "Expired" : "Active"}
                    </Badge>
                    {active && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate(
                            { action: "end_support_session", reason: "Session ended by staff", payload: { session_id: s.id } },
                            {
                              onSuccess: () => toast.success("Session ended"),
                              onError: (e: any) => toast.error(e.message),
                            },
                          )
                        }
                      >
                        End now
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
