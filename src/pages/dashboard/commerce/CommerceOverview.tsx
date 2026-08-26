import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CreditCard, ExternalLink, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, useSellerAccount, useShopOrders, useShopProducts, useShopStore } from "@/hooks/useCommerce";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";

export default function CommerceOverview() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: store, isLoading } = useShopStore();
  const { data: products = [] } = useShopProducts(store?.id);
  const { data: orders = [] } = useShopOrders(store?.id);
  const { data: seller } = useSellerAccount();

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === "paid" || o.status === "partially_refunded");
    const revenue = paid.reduce((sum, o) => sum + o.total_amount - (o.refunded_amount ?? 0), 0);
    return {
      revenue,
      orders: paid.length,
      pendingFulfilment: paid.filter((o) => o.fulfilment_status === "unfulfilled").length,
      liveProducts: products.filter((p) => p.status === "active").length,
    };
  }, [orders, products]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const currency = store.currency;

  const setupIssues: { message: string; cta: string; to: string }[] = [];
  if (!seller?.charges_enabled) {
    setupIssues.push({
      message: "Connect Stripe so your store can take payments into your own account.",
      cta: "Connect Stripe",
      to: `/dashboard/${workspaceId}/commerce/settings`,
    });
  }
  if (store.status !== "published") {
    setupIssues.push({
      message: "Your store is not published yet, so customers cannot see it.",
      cta: "Publish store",
      to: `/dashboard/${workspaceId}/commerce/settings`,
    });
  }
  if (stats.liveProducts === 0) {
    setupIssues.push({
      message: "You have no live products. Publish at least one product so customers can buy.",
      cta: "Add a product",
      to: `/dashboard/${workspaceId}/commerce/products`,
    });
  }
  // Auto-generated slugs end in a random 4-char suffix (see useCommerce.createStore).
  if (/^[a-z0-9-]+-[a-z0-9]{4}$/.test(store.slug ?? "")) {
    setupIssues.push({
      message: "Your storefront is still using its auto-generated web address. Set a memorable slug.",
      cta: "Customise address",
      to: `/dashboard/${workspaceId}/commerce/storefront`,
    });
  }

  return (
    <div className="space-y-6">
      {setupIssues.length > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-5 w-5 text-accent" />
            Finish setting up your storefront
          </div>
          {setupIssues.map((issue) => (
            <div key={issue.message} className="flex flex-wrap items-center gap-3 text-sm pl-7">
              <p className="flex-1 text-muted-foreground">{issue.message}</p>
              <Button asChild size="sm" variant="outline">
                <Link to={issue.to}>{issue.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: formatMoney(stats.revenue, currency) },
          { label: "Paid orders", value: String(stats.orders) },
          { label: "Awaiting despatch", value: String(stats.pendingFulfilment) },
          { label: "Live products", value: String(stats.liveProducts) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="font-semibold">Recent orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/dashboard/${workspaceId}/commerce/orders`}>
                View all <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <ShoppingBag className="mx-auto mb-3 h-8 w-8" />
              No orders yet. Share your storefront link to get your first sale.
            </div>
          ) : (
            <ul className="divide-y">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge>
                    <span className="font-semibold">{formatMoney(o.total_amount, o.currency)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Your storefront</h2>
            <p className="mt-1 break-all text-xs text-muted-foreground">/s/{store.slug}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer">
                Open storefront <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Payments</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {seller?.charges_enabled
                ? `Connected${seller.country ? ` · ${seller.country}` : ""}${seller.livemode ? " · live" : " · test"}`
                : "Stripe is not connected yet."}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
              <Link to={`/dashboard/${workspaceId}/commerce/settings`}>Manage payments</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
