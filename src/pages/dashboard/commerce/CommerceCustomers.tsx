import { Skeleton } from "@/components/ui/skeleton";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import { formatMoney, useShopCustomers, useShopStore } from "@/hooks/useCommerce";

export default function CommerceCustomers() {
  const { data: store, isLoading } = useShopStore();
  const { data: customers = [], isLoading: loadingCustomers } = useShopCustomers(store?.id);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Customers</h2>
      {loadingCustomers ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Customers appear here after their first order.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Spent</th>
                <th className="p-3">Last order</th>
                <th className="p-3">Marketing</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c: any) => (
                <tr key={c.id}>
                  <td className="p-3">
                    <p className="font-medium">{c.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="p-3">{c.total_orders ?? 0}</td>
                  <td className="p-3">{formatMoney(c.total_spent ?? 0, store.currency)}</td>
                  <td className="p-3">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3">{c.marketing_opt_in ? "Opted in" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
