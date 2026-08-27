import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { usePlatformWhatsAppHealth } from "@/hooks/usePlatformAdmin";
import { PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

const UNKNOWN = <span className="text-muted-foreground">Unknown / not verified</span>;

function ts(value: string | null | undefined) {
  if (!value) return UNKNOWN;
  return <span title={format(new Date(value), "PPpp")}>{formatDistanceToNow(new Date(value), { addSuffix: true })}</span>;
}

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed") return "destructive";
  if (status === "delivered" || status === "read") return "default";
  if (status === "submitted" || status === "queued") return "outline";
  return "secondary";
}

export default function PlatformWhatsApp() {
  const query = usePlatformWhatsAppHealth();
  const data = query.data as any;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const metrics = data?.metrics ?? {};
  const health = (data?.health ?? []) as any[];
  const recent = (data?.recent ?? []) as any[];

  const rows = useMemo(() => {
    return recent.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return [r.workspace_name, r.template_name, r.wa_message_id, r.error, r.sender_phone_number_id]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [recent, statusFilter, search]);

  const lastWebhook = data?.last_webhook_at as string | null;
  const webhookSilent = !lastWebhook || Date.now() - new Date(lastWebhook).getTime() > 24 * 60 * 60 * 1000;

  return (
    <div>
      <PageHeader
        title="WhatsApp delivery"
        description="Evidence-only provider health and delivery logs. Statuses come exclusively from Meta status webhooks — nothing here is inferred."
      />

      {query.isLoading ? (
        <LoadingBlock rows={4} />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Submitted" value={metrics.submitted ?? 0} hint="Accepted by Meta, unconfirmed" />
            <StatCard label="Sent" value={metrics.sent ?? 0} />
            <StatCard label="Delivered" value={metrics.delivered ?? 0} />
            <StatCard label="Read" value={metrics.read ?? 0} />
            <StatCard label="Failed" value={metrics.failed ?? 0} tone={metrics.failed > 0 ? "warning" : "default"} />
            <StatCard
              label="Unconfirmed >15m"
              value={metrics.unconfirmed ?? 0}
              tone={metrics.unconfirmed > 0 ? "warning" : "default"}
              hint="No Meta callback received"
            />
          </div>

          {webhookSilent && (
            <Card className="mt-4 border-amber-500/50 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 py-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-medium">Webhook silence detected</p>
                  <p className="text-muted-foreground">
                    No signed Meta callback has been recorded in the last 24 hours
                    {lastWebhook ? <> (last: {format(new Date(lastWebhook), "PPpp")})</> : " (none ever recorded)"}.
                    Delivery statuses cannot be confirmed until the messages webhook field is subscribed and verified.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Provider health</CardTitle>
              <CardDescription>
                Recorded evidence per workspace sender. Missing evidence is shown as unknown, never assumed healthy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {health.length === 0 ? (
                <EmptyBlock title="No provider evidence recorded yet" description="Health rows are written when Meta callbacks arrive or a diagnostic check runs." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">WABA / number</th>
                        <th className="py-2 pr-3">Token</th>
                        <th className="py-2 pr-3">Subscription</th>
                        <th className="py-2 pr-3">Last webhook</th>
                        <th className="py-2 pr-3">Sent</th>
                        <th className="py-2 pr-3">Delivered</th>
                        <th className="py-2 pr-3">Failed</th>
                        <th className="py-2 pr-3">Templates synced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {health.map((h) => (
                        <tr key={h.workspace_id}>
                          <td className="py-2 pr-3">
                            <p className="font-mono text-xs">{h.waba_id || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.display_phone_number || h.phone_number_id || "—"}
                              {h.phone_registration_state ? ` · ${h.phone_registration_state}` : ""}
                            </p>
                          </td>
                          <td className="py-2 pr-3">
                            {h.token_configured === null || h.token_configured === undefined
                              ? UNKNOWN
                              : <Badge variant={h.token_configured ? "secondary" : "destructive"}>{h.token_configured ? "Configured" : "Missing"}</Badge>}
                            <p className="text-xs text-muted-foreground">{h.token_type || ""}</p>
                          </td>
                          <td className="py-2 pr-3 text-xs">
                            <p>App: {h.app_subscribed === null ? "Unknown" : h.app_subscribed ? "Subscribed" : "Not subscribed"}</p>
                            <p>messages: {h.messages_field_subscribed === null ? "Unknown" : h.messages_field_subscribed ? "Yes" : "No"}</p>
                          </td>
                          <td className="py-2 pr-3 text-xs">{ts(h.last_webhook_at)}</td>
                          <td className="py-2 pr-3 text-xs">{ts(h.last_sent_callback_at)}</td>
                          <td className="py-2 pr-3 text-xs">{ts(h.last_delivered_callback_at)}</td>
                          <td className="py-2 pr-3 text-xs">{ts(h.last_failed_callback_at)}</td>
                          <td className="py-2 pr-3 text-xs">{ts(h.last_template_sync_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delivery log</CardTitle>
              <CardDescription>Latest 100 outbound WhatsApp messages with their genuine Meta lifecycle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workspace, template, WAMID, error…"
                  className="max-w-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {["submitted", "sent", "delivered", "read", "failed"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rows.length === 0 ? (
                <EmptyBlock title="No matching messages" description="Adjust the filters to widen the search." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">When</th>
                        <th className="py-2 pr-3">Workspace</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Template</th>
                        <th className="py-2 pr-3">Sender</th>
                        <th className="py-2 pr-3">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 pr-3 text-xs">{ts(r.created_at)}</td>
                          <td className="py-2 pr-3 text-xs">{r.workspace_name || r.workspace_id}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={statusTone(r.status)} className="capitalize">{r.status}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs">
                            {r.template_name || "—"}
                            {r.language_code ? <span className="text-muted-foreground"> · {r.language_code}</span> : null}
                          </td>
                          <td className="py-2 pr-3 text-xs">
                            {r.sender_phone_number_id || "—"}
                            {r.sender_ownership ? <span className="text-muted-foreground"> · {r.sender_ownership}</span> : null}
                          </td>
                          <td className="py-2 pr-3 text-xs">
                            <p className="font-mono break-all text-[11px] text-muted-foreground">{r.wa_message_id || "no wamid"}</p>
                            {r.status === "failed" && (
                              <p className="text-destructive">
                                {r.error_details || r.error || "No Meta detail"}
                                {r.error_code ? ` (code ${r.error_code})` : ""}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
