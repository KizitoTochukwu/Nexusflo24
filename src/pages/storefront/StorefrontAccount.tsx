import { Link, useParams } from "react-router-dom";
import { GraduationCap, KeyRound, Package, ShoppingBag } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { useAuth } from "@/contexts/AuthContext";
import { money, orderStatusLabel, useMyPurchases, usePublicStore } from "@/hooks/useStorefront";
import { entitlementKindLabel, useClaimEntitlements, useMyEntitlements } from "@/hooks/useEntitlements";

export default function StorefrontAccount() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { user, loading } = useAuth();
  const { data: store } = usePublicStore(storeSlug);
  const { data: purchases, isLoading } = useMyPurchases(!!user);
  useClaimEntitlements(!!user);
  const { data: entitlements = [] } = useMyEntitlements(!!user);
  const activeAccess = entitlements.filter((e) => e.status === "active");

  if (!store) return <div className="p-10"><Skeleton className="h-64" /></div>;

  return (
    <StorefrontShell store={store}>
      <Seo title={`My purchases | ${store.name}`} description="View your orders, downloads and plans." />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">My purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders, downloads and recurring plans linked to your account.
        </p>

        {!user && !loading && (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">Sign in to see your purchases</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Any orders placed with your email address will be linked automatically.
            </p>
            <Button asChild className="mt-5">
              <Link to={`/login?redirect=/s/${store.slug}/account`}>Sign in</Link>
            </Button>
          </div>
        )}

        {user && isLoading && <Skeleton className="mt-8 h-40" />}

        {user && !isLoading && (purchases?.length ?? 0) === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No purchases yet</h2>
            <Button asChild variant="outline" className="mt-5">
              <Link to={`/s/${store.slug}`}>Browse the store</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {purchases?.map((p) => (
            <Link
              key={p.id}
              to={`/s/${p.store_slug}/order/${p.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.order_number}</span>
                  <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                    {orderStatusLabel(p.status)}
                  </Badge>
                  {p.stripe_subscription_id && <Badge variant="outline">Recurring</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {p.store_name} · {p.item_count} item{Number(p.item_count) === 1 ? "" : "s"} ·{" "}
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="shrink-0 font-semibold">{money(p.total_amount, p.currency)}</span>
            </Link>
          ))}
        </div>

        {user && activeAccess.length > 0 && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" /> My access
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses, memberships and downloads unlocked by your purchases.
            </p>
            <div className="mt-4 space-y-3">
              {activeAccess.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.resource_label ?? e.resource_ref}</span>
                      <Badge variant="outline">{entitlementKindLabel(e.kind)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.store_name}
                      {e.expires_at ? ` · until ${new Date(e.expires_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {e.kind === "course" ? (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={`/academy/${e.resource_ref}`}>
                        <GraduationCap className="mr-1 h-4 w-4" /> Open course
                      </Link>
                    </Button>
                  ) : e.order_id ? (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={`/s/${e.store_slug}/order/${e.order_id}`}>View order</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StorefrontShell>
  );
}
