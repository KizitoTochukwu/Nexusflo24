import { format } from "date-fns";
import { usePlatformIntegrationHealth } from "@/hooks/usePlatformAdmin";
import { PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (warn) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export default function PlatformIntegrations() {
  const health = usePlatformIntegrationHealth();
  const h = health.data as any;

  const providers = (h?.providers ?? []) as any[];
  const configured = providers.filter((p) => p.configured).length;

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Read-only diagnostics for platform-wide delivery providers and ad account connections."
      />

      {health.isLoading ? (
        <LoadingBlock rows={3} />
      ) : health.error ? (
        <ErrorBlock error={health.error} onRetry={() => health.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Providers configured" value={`${configured}/${providers.length}`} hint="Edge-function credentials present" />
            <StatCard
              label="Ad connections expiring ≤7d"
              value={h?.ad_connections_expiring ?? 0}
              tone={h?.ad_connections_expiring > 0 ? "warning" : "default"}
              hint="OAuth tokens near expiry"
            />
            <StatCard
              label="Stale ad syncs"
              value={h?.stale_sync_accounts ?? 0}
              tone={h?.stale_sync_accounts > 0 ? "warning" : "default"}
              hint="No successful sync in 24h"
            />
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delivery providers</CardTitle>
              <CardDescription>Configuration status only — credentials are never displayed.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {providers.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">{p.configured ? "Ready to send" : "Not configured — sending on this channel is disabled"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon ok={p.configured} />
                      <Badge variant={p.configured ? "default" : "secondary"}>{p.configured ? "Configured" : "Missing"}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ad account connections</CardTitle>
              <CardDescription>Meta / Google Ads OAuth connections per workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {!(h?.ad_connections ?? []).length ? (
                <EmptyBlock title="No ad accounts connected" />
              ) : (
                <ul className="divide-y text-sm">
                  {(h.ad_connections as any[]).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium capitalize">{c.provider} <span className="text-xs font-normal text-muted-foreground">· {c.workspace_name ?? "Unknown workspace"}</span></p>
                        <p className="text-[11px] text-muted-foreground">
                          Last sync: {c.last_synced_at ? format(new Date(c.last_synced_at), "MMM d, HH:mm") : "never"}
                          {c.token_expires_at ? ` · token expires ${format(new Date(c.token_expires_at), "MMM d")}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon ok={c.status === "connected"} warn={c.stale} />
                        <Badge variant={c.status === "connected" ? (c.stale ? "secondary" : "default") : "destructive"}>
                          {c.stale ? "stale" : c.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Shop payment connections</CardTitle>
              <CardDescription>Stripe Connect onboarding across workspace stores</CardDescription>
            </CardHeader>
            <CardContent>
              {!(h?.shop_connections ?? []).length ? (
                <EmptyBlock title="No shop payment accounts" />
              ) : (
                <ul className="divide-y text-sm">
                  {(h.shop_connections as any[]).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.workspace_name ?? "Unknown workspace"}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {s.provider} · onboarding {s.onboarding_status}
                          {s.disconnected_at ? " · disconnected" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon ok={!!s.charges_enabled && !s.disconnected_at} warn={!!s.details_submitted && !s.charges_enabled} />
                        <Badge variant={s.charges_enabled && !s.disconnected_at ? "default" : "secondary"}>
                          {s.disconnected_at ? "disconnected" : s.charges_enabled ? "active" : "incomplete"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
