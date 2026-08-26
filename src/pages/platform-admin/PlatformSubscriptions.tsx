import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, StatCard,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;

function useSubscriptions() {
  return useQuery({
    queryKey: ["platform-subscriptions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("subscriptions")
        .select("id, user_id, plan, status, billing_cycle, current_period_end, cancel_at_period_end, stripe_customer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export default function PlatformSubscriptions() {
  const { data, isLoading, error, refetch } = useSubscriptions();
  const rows = data ?? [];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Stripe-backed subscription records. Billing changes are made in Stripe and reflected here."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total records" value={rows.length} />
        <StatCard label="Active" value={rows.filter((r) => r.status === "active").length} tone="accent" />
        <StatCard label="Trialing" value={rows.filter((r) => r.status === "trialing").length} />
        <StatCard
          label="Cancelling"
          value={rows.filter((r) => r.cancel_at_period_end).length}
          tone={rows.some((r) => r.cancel_at_period_end) ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingBlock rows={6} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !rows.length ? (
            <EmptyBlock
              title="No subscription records"
              description="Subscriptions appear once a customer completes Stripe checkout."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Cycle</th>
                    <th className="px-3 py-2 font-medium">Renews</th>
                    <th className="px-3 py-2 font-medium">Stripe customer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-3 capitalize">{s.plan ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge variant={["active", "trialing"].includes(s.status) ? "default" : "secondary"}>
                          {s.status}
                        </Badge>
                        {s.cancel_at_period_end && (
                          <Badge variant="destructive" className="ml-1">
                            Cancelling
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">{s.billing_cycle ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">{s.stripe_customer_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
