import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  usePlatformAction, usePlatformCommunicationsMetrics, usePlatformSenderQueue,
} from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function pct(delivered: number, total: number) {
  if (!total) return "—";
  return `${Math.round((delivered / total) * 100)}%`;
}

function statusCounts(byStatus: Record<string, number> | undefined) {
  const entries = Object.entries(byStatus ?? {});
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const delivered = entries
    .filter(([s]) => ["sent", "delivered", "read"].includes(s))
    .reduce((a, [, n]) => a + n, 0);
  const failed = entries
    .filter(([s]) => ["failed", "error", "bounced"].includes(s))
    .reduce((a, [, n]) => a + n, 0);
  return { total, delivered, failed };
}

export default function PlatformCommunications() {
  const metrics = usePlatformCommunicationsMetrics(30);
  const queue = usePlatformSenderQueue();
  const action = usePlatformAction();
  const [decision, setDecision] = useState<{ id: string; label: string; status: "approved" | "rejected" | "suspended" } | null>(null);

  const m = metrics.data as any;
  const email = statusCounts(m?.email?.by_status);
  const sms = statusCounts(m?.sms?.by_status);
  const wa = statusCounts(m?.whatsapp?.by_status);

  const pendingProfiles = ((queue.data as any)?.sender_profiles ?? []).filter((s: any) => s.status === "pending");

  return (
    <div>
      <PageHeader
        title="Communications"
        description="Platform-wide email, SMS and WhatsApp delivery over the last 30 days."
      />

      {metrics.isLoading ? (
        <LoadingBlock rows={3} />
      ) : metrics.error ? (
        <ErrorBlock error={metrics.error} onRetry={() => metrics.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Email sent" value={email.total} hint={`${pct(email.delivered, email.total)} delivered · ${email.failed} failed`} />
            <StatCard label="SMS sent" value={sms.total} hint={`${pct(sms.delivered, sms.total)} delivered · ${sms.failed} failed`} />
            <StatCard label="WhatsApp sent" value={wa.total} hint={`${pct(wa.delivered, wa.total)} delivered · ${wa.failed} failed`} />
            <StatCard
              label="Workspaces with no approved sender"
              value={m?.workspaces_without_senders ?? 0}
              hint="These workspaces cannot send until a sender is approved"
              tone={m?.workspaces_without_senders > 0 ? "warning" : "default"}
            />
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily volume</CardTitle>
              <CardDescription>Sent / delivered / failed per channel per day</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!(m?.daily ?? []).length ? (
                <EmptyBlock title="No messages sent in this period" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Day</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">SMS</th>
                      <th className="py-2 font-medium">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(m.daily as any[]).slice(-14).reverse().map((d) => (
                      <tr key={d.day} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">{format(new Date(d.day), "MMM d")}</td>
                        <td className="py-2 pr-4">{d.email_total} <span className="text-xs text-muted-foreground">({d.email_failed} failed)</span></td>
                        <td className="py-2 pr-4">{d.sms_total} <span className="text-xs text-muted-foreground">({d.sms_failed} failed)</span></td>
                        <td className="py-2">{d.wa_total} <span className="text-xs text-muted-foreground">({d.wa_failed} failed)</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sender approvals</CardTitle>
          <CardDescription>
            {pendingProfiles.length
              ? `${pendingProfiles.length} sender profile${pendingProfiles.length === 1 ? "" : "s"} awaiting review`
              : "All sender profiles across every workspace"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.isLoading ? (
            <LoadingBlock rows={3} />
          ) : queue.error ? (
            <ErrorBlock error={queue.error} onRetry={() => queue.refetch()} />
          ) : (
            <Tabs defaultValue="profiles">
              <TabsList>
                <TabsTrigger value="profiles">Sender profiles</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp senders</TabsTrigger>
                <TabsTrigger value="sms">SMS senders</TabsTrigger>
              </TabsList>

              <TabsContent value="profiles">
                {!(queue.data as any)?.sender_profiles?.length ? (
                  <EmptyBlock title="No sender profiles yet" />
                ) : (
                  <ul className="divide-y text-sm">
                    {(queue.data as any).sender_profiles.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {s.label || s.display_name || s.address}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">{s.workspace_name ?? "Unknown workspace"}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {s.channel} · {s.address}
                            {s.rejection_reason ? ` · rejected: ${s.rejection_reason}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.status === "approved" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>
                            {s.status}
                          </Badge>
                          {s.status !== "approved" && (
                            <Button size="sm" variant="outline" onClick={() => setDecision({ id: s.id, label: s.label || s.address, status: "approved" })}>
                              Approve
                            </Button>
                          )}
                          {s.status === "pending" && (
                            <Button size="sm" variant="destructive" onClick={() => setDecision({ id: s.id, label: s.label || s.address, status: "rejected" })}>
                              Reject
                            </Button>
                          )}
                          {s.status === "approved" && (
                            <Button size="sm" variant="destructive" onClick={() => setDecision({ id: s.id, label: s.label || s.address, status: "suspended" })}>
                              Suspend
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="whatsapp">
                {!(queue.data as any)?.whatsapp_senders?.length ? (
                  <EmptyBlock title="No WhatsApp senders registered" />
                ) : (
                  <ul className="divide-y text-sm">
                    {(queue.data as any).whatsapp_senders.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.business_name || s.phone_number}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.workspace_name ?? "No linked workspace"} · {s.provider} · {s.phone_number}
                          </p>
                        </div>
                        <Badge variant={s.verification_status === "verified" ? "default" : "secondary"}>
                          {s.verification_status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="sms">
                {!(queue.data as any)?.sms_senders?.length ? (
                  <EmptyBlock title="No SMS senders registered" />
                ) : (
                  <ul className="divide-y text-sm">
                    {(queue.data as any).sms_senders.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.display_name || s.phone_number}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {s.workspace_name ?? "No linked workspace"} · {s.sender_type} · {s.phone_number}
                          </p>
                        </div>
                        <Badge variant={s.verification_status === "verified" ? "default" : "secondary"}>
                          {s.verification_status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <HighRiskActionDialog
        open={!!decision}
        onOpenChange={(v) => !v && setDecision(null)}
        title={`${decision?.status === "approved" ? "Approve" : decision?.status === "rejected" ? "Reject" : "Suspend"} sender`}
        description={`This will mark sender "${decision?.label}" as ${decision?.status} across the platform.`}
        confirmLabel="Confirm"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "set_sender_status", reason, payload: { sender_profile_id: decision!.id, status: decision!.status } },
            {
              onSuccess: () => {
                toast.success(`Sender ${decision!.status}`);
                setDecision(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}
