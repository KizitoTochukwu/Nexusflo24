import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Plug, RefreshCw, Sparkles, Trash2, Settings2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import {
  useAdConnections, useAdAccounts, useSyncAdConnection, useDisconnectAdConnection,
  useUpdateAdAccount, useAdSyncLogs,
} from "@/hooks/useAds";
import { useSeedAdsDemo, useClearAdsDemo } from "@/hooks/useAdsDemo";
import { usePipelines } from "@/hooks/useDeals";
import { AD_PROVIDER_LIST, type AdProvider } from "@/lib/ads/constants";
import { StatusPill } from "@/components/ads/AdsPrimitives";
import ConnectAccountDialog from "@/components/ads/ConnectAccountDialog";

export default function AdsAccounts() {
  const workspaceId = useWorkspaceId();
  const { canManage } = useWorkspaceRole();
  const { data: connections = [], isLoading } = useAdConnections(workspaceId);
  const { data: accounts = [] } = useAdAccounts(workspaceId);
  const { data: logs = [] } = useAdSyncLogs(workspaceId);
  const { data: pipelines = [] } = usePipelines(workspaceId);

  const sync = useSyncAdConnection();
  const disconnect = useDisconnectAdConnection();
  const updateAccount = useUpdateAdAccount();
  const seed = useSeedAdsDemo();
  const clearDemo = useClearAdsDemo();

  const [dialogProvider, setDialogProvider] = useState<AdProvider | null>(null);
  const hasDemo = connections.some((c) => c.is_demo);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connected Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Authorise advertising channels so campaigns, spend and leads flow into NexusFlo24 automatically.
          </p>
        </div>
        <div className="flex gap-2">
          {hasDemo ? (
            <Button variant="outline" className="gap-2" disabled={clearDemo.isPending} onClick={() => clearDemo.mutate(workspaceId)}>
              <Trash2 className="h-4 w-4" /> Remove sample data
            </Button>
          ) : (
            <Button variant="outline" className="gap-2" disabled={seed.isPending} onClick={() => seed.mutate(workspaceId)}>
              {seed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Load sample data
            </Button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Only workspace owners and admins can connect or manage advertising accounts.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {AD_PROVIDER_LIST.map((meta) => {
          const connection = connections.find((c) => c.provider === meta.id);
          const linked = accounts.filter((a) => a.provider === meta.id);
          const status = connection?.status ?? "disconnected";

          return (
            <Card key={meta.id} className="flex flex-col border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}1A` }}>
                      <Plug className="h-4 w-4" style={{ color: meta.color }} />
                    </span>
                    <div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      <CardDescription className="text-xs">{meta.subChannels.join(" · ")}</CardDescription>
                    </div>
                  </div>
                  <StatusPill status={status} />
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-sm text-muted-foreground">{meta.blurb}</p>

                <dl className="space-y-1.5 text-sm">
                  <Row label="Business" value={connection?.business_name || "Not connected"} />
                  <Row
                    label="Last sync"
                    value={connection?.last_sync_at ? `${formatDistanceToNow(new Date(connection.last_sync_at))} ago` : "Never"}
                  />
                  <Row label="Linked ad accounts" value={String(linked.length)} />
                </dl>

                {connection?.last_error && status === "needs_attention" && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700">
                    {connection.last_error}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={status === "connected" ? "outline" : "default"}
                    disabled={!canManage}
                    onClick={() => setDialogProvider(meta.id)}
                  >
                    {status === "connected" ? "Manage connection" : status === "needs_attention" ? "Reconnect" : "Connect account"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    disabled={!canManage || !connection || sync.isPending}
                    onClick={() => sync.mutate({ workspaceId, provider: meta.id })}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} /> Sync now
                  </Button>
                  {connection && status !== "disconnected" && (
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={!canManage} onClick={() => disconnect.mutate(connection.id)}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Linked ad accounts */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-accent" /> Linked ad accounts</CardTitle>
          <CardDescription>Choose which accounts sync and where their leads land in the CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && accounts.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No ad accounts yet. Connect a channel above to select accounts.</p>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.external_account_id} · {a.currency}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={a.default_pipeline_id ?? "none"}
                  onValueChange={(v) => updateAccount.mutate({ id: a.id, default_pipeline_id: v === "none" ? null : v })}
                  disabled={!canManage}
                >
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Default pipeline" /></SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="none">No default pipeline</SelectItem>
                    {pipelines.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`enabled-${a.id}`}
                    checked={a.is_enabled}
                    disabled={!canManage}
                    onCheckedChange={(v) => updateAccount.mutate({ id: a.id, is_enabled: v })}
                  />
                  <Label htmlFor={`enabled-${a.id}`} className="text-xs text-muted-foreground">Syncing</Label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sync history */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sync history</CardTitle>
          <CardDescription>The most recent data pulls from your advertising channels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="py-3 text-sm text-muted-foreground">No syncs recorded yet.</p>}
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] capitalize">{log.provider}</Badge>
                <span className="text-muted-foreground">{log.message || `${log.records_synced} records`}</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={log.status === "success" ? "connected" : log.status === "failed" ? "disconnected" : "pending"} />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.started_at))} ago
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        NexusFlo24 uses secure authorisation only — we never ask for or store your advertising passwords, and access
        tokens stay encrypted on the server.
      </p>

      {dialogProvider && (
        <ConnectAccountDialog
          provider={dialogProvider}
          open={!!dialogProvider}
          onOpenChange={(v) => !v && setDialogProvider(null)}
          connection={connections.find((c) => c.provider === dialogProvider)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-xs font-medium">{value}</dd>
    </div>
  );
}
