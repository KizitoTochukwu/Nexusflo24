import { Link, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { money, usePublicProducts, usePublicStore, useBasket } from "@/hooks/useStorefront";

export default function StorefrontHome() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { data: store, isLoading } = usePublicStore(storeSlug);
  const { data: products = [], isLoading: loadingProducts } = usePublicProducts(storeSlug);
  const basket = useBasket(storeSlug);

  if (isLoading) return <div className="p-10"><Skeleton className="h-64" /></div>;
  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-10 text-center">
        <div>
          <h1 className="text-2xl font-bold">Store not found</h1>
          <p className="mt-2 text-muted-foreground">This storefront is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontShell store={store} basketCount={basket.count}>
      <Seo
        title={store.seo_title || `${store.name} | Online store`}
        description={store.seo_description || store.description || `Shop ${store.name} online.`}
      />

      <section
        className="rounded-3xl px-8 py-14 text-center"
        style={{ background: store.primary_color }}
      >
        <h1 className="text-3xl font-bold text-white md:text-4xl">{store.name}</h1>
        {store.tagline && <p className="mt-3 text-white/80">{store.tagline}</p>}
        {store.description && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70">{store.description}</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Shop</h2>
        {loadingProducts ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" />
          </div>
        ) : products.length === 0 ? (
          <p className="mt-6 rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No products are available yet. Please check back soon.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-44 w-full object-cover" />
                  : <div className="h-44 w-full bg-muted" />}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.short_description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.short_description}</p>
                  )}
                  <p className="mt-3 text-lg font-bold">
                    {money(p.price_amount, p.currency)}
                    {p.billing_type === "recurring" && (
                      <span className="text-sm font-normal text-muted-foreground">/{p.billing_interval ?? "month"}</span>
                    )}
                  </p>
                  <Button asChild className="mt-4" style={{ background: store.accent_color, color: "#0B1F3A" }}>
                    <Link to={`/s/${store.slug}/p/${p.slug}`}>{p.button_text || "View"}</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {basket.count > 0 && (
        <Button asChild className="fixed bottom-6 right-6 shadow-lg">
          <Link to={`/s/${store.slug}/checkout`}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Basket ({basket.count})
          </Link>
        </Button>
      )}
    </StorefrontShell>
  );
}
