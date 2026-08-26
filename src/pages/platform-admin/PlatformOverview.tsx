import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlatformMetrics } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const RANGES = [7, 30, 90];

export default function PlatformOverview() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch } = usePlatformMetrics(days);

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        description="Live platform-wide metrics, sourced directly from production data."
        actions={
          <div className="flex gap-1 rounded-md border p-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={days === r ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setDays(r)}
              >
                {r}d
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock rows={6} />
      ) : error ? (
        <ErrorBlock error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <EmptyBlock title="No metrics available" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={data.total_users} hint={`${data.new_users} new in ${days}d`} />
            <StatCard label="Active users" value={data.active_users} hint={`Signed in within ${days}d`} tone="accent" />
            <StatCard label="Workspaces" value={data.total_workspaces} hint={`${data.new_workspaces} new in ${days}d`} />
            <StatCard
              label="Estimated MRR"
              value={`$${Number(data.mrr ?? 0).toFixed(2)}`}
              hint="Active + trialing subscriptions at current plan prices"
              tone="accent"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active subscriptions" value={data.subs_active} />
            <StatCard label="Trialing" value={data.subs_trialing} />
            <StatCard label="Past due" value={data.subs_past_due} tone={data.subs_past_due ? "warning" : "default"} />
            <StatCard
              label="Suspended accounts"
              value={data.suspended_users}
              tone={data.suspended_users ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New users</CardTitle>
                <CardDescription>Signups per day over the last {days} days</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {data.user_growth?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.user_growth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--accent))"
                        fill="hsl(var(--accent) / 0.2)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyBlock title="No signups in this period" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Plan distribution</CardTitle>
                <CardDescription>Subscription records grouped by plan</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(data.plan_distribution ?? {}).length ? (
                  <ul className="space-y-2">
                    {Object.entries(data.plan_distribution).map(([plan, count]) => (
                      <li key={plan} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{plan}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyBlock title="No subscription records yet" />
                )}
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Users without a subscription record are not counted here — see Users for account status.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Store fulfilment</CardTitle>
                <CardDescription>Automation store orders and delivery projects</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Paid orders</p>
                  <p className="text-xl font-semibold">{data.store_orders_paid}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fulfilment projects</p>
                  <p className="text-xl font-semibold">{data.fulfilment_projects}</p>
                </div>
                <div className="col-span-2 rounded-md border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">Paid orders without a project</p>
                  <p
                    className={`text-xl font-semibold ${
                      data.orders_missing_projects ? "text-destructive" : ""
                    }`}
                  >
                    {data.orders_missing_projects}
                  </p>
                  <Link
                    to="/platform-admin/fulfilment"
                    className="mt-1 inline-block text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Review fulfilment
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Newest accounts</CardTitle>
                <CardDescription>Most recent signups</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent_users?.length ? (
                  <ul className="divide-y text-sm">
                    {data.recent_users.map((u) => (
                      <li key={u.id} className="flex items-center justify-between py-2">
                        <span className="truncate">{u.email}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("en-GB")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyBlock title="No accounts yet" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
