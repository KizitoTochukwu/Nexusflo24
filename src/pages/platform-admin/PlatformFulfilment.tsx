import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePlatformAction, usePlatformFulfilmentOverview } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminStoreOrders from "@/pages/admin/AdminStoreOrders";

export default function PlatformFulfilment() {
  const overview = usePlatformFulfilmentOverview();
  const action = usePlatformAction();
  const [create, setCreate] = useState<any | null>(null);

  const o = overview.data as any;

  return (
    <div>
      <PageHeader
        title="Store Fulfilment"
        description="Paid automation store orders, delivery projects and reconciliation across all workspaces."
      />

      {overview.isLoading ? (
        <LoadingBlock rows={3} />
      ) : overview.error ? (
        <ErrorBlock error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Paid store orders" value={o?.total_paid_orders ?? 0} />
          <StatCard label="Fulfilment projects" value={o?.total_projects ?? 0} />
          <StatCard
            label="Missing projects"
            value={(o?.missing_projects ?? []).length}
            tone={(o?.missing_projects ?? []).length > 0 ? "warning" : "default"}
            hint="Paid orders with no delivery project"
          />
        </div>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Orders missing a project</CardTitle>
          <CardDescription>Create a delivery project for a paid order. Safe to re-run — existing projects are never duplicated.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.isLoading ? (
            <LoadingBlock rows={2} />
          ) : !(o?.missing_projects ?? []).length ? (
            <EmptyBlock title="Nothing to reconcile" description="Every paid order has a fulfilment project." />
          ) : (
            <ul className="divide-y text-sm">
              {(o.missing_projects as any[]).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">£{Number(m.total_gbp ?? 0).toFixed(2)} — {m.customer_name || m.customer_email || "Unknown customer"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(m.created_at), "MMM d, HH:mm")} · order {String(m.id).slice(0, 8)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setCreate(m)}>
                    Create project
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 border-t pt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fulfilment order manager
        </h2>
        <AdminStoreOrders bare />
      </div>

      <HighRiskActionDialog
        open={!!create}
        onOpenChange={(v) => !v && setCreate(null)}
        title="Create fulfilment project"
        description={`Create a delivery project for paid order ${create ? String(create.id).slice(0, 8) : ""}.`}
        confirmLabel="Create project"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "create_fulfilment_project", reason, payload: { store_order_id: create.id } },
            {
              onSuccess: (r: any) => {
                toast.success(r?.already_existed ? "Project already existed" : "Project created");
                setCreate(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}

// Re-export Badge import guard (Badge used implicitly by AdminStoreOrders only)
export { Badge as _BadgeReexportGuard };
