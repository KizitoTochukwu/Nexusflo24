import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { money, useBasket, usePublicProduct, usePublicStore } from "@/hooks/useStorefront";

export default function StorefrontProduct() {
  const { storeSlug, productSlug } = useParams<{ storeSlug: string; productSlug: string }>();
  const navigate = useNavigate();
  const { data: store } = usePublicStore(storeSlug);
  const { data: product, isLoading } = usePublicProduct(storeSlug, productSlug);
  const basket = useBasket(storeSlug);
  const [variantId, setVariantId] = useState<string | null>(null);

  if (!store || isLoading) return <div className="p-10"><Skeleton className="h-64" /></div>;
  if (!product) {
    return (
      <StorefrontShell store={store} basketCount={basket.count}>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Button asChild className="mt-6"><Link to={`/s/${store.slug}`}>Back to shop</Link></Button>
        </div>
      </StorefrontShell>
    );
  }

  const variants: any[] = product.variants ?? [];
  const media: any[] = product.media ?? [];
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const unit = variant?.price_amount ?? product.price_amount;

  const addToBasket = (goToCheckout = false) => {
    if (variants.length && !variantId) {
      toast.error("Please choose an option first.");
      return;
    }
    basket.add({
      productId: product.id,
      variantId,
      name: variant ? `${product.name} — ${variant.name}` : product.name,
      unitAmount: unit,
      quantity: 1,
      requiresShipping: product.requires_shipping,
      imageUrl: media[0]?.url ?? null,
    });
    if (goToCheckout) navigate(`/s/${store.slug}/checkout`);
    else toast.success("Added to your basket");
  };

  return (
    <StorefrontShell store={store} basketCount={basket.count}>
      <Seo
        title={product.seo_title || `${product.name} | ${store.name}`}
        description={product.seo_description || product.short_description || `Buy ${product.name} from ${store.name}.`}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          {media[0]?.url
            ? <img src={media[0].url} alt={media[0].alt || product.name} className="w-full rounded-2xl object-cover" />
            : <div className="aspect-square w-full rounded-2xl bg-muted" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          {product.short_description && (
            <p className="mt-2 text-muted-foreground">{product.short_description}</p>
          )}
          <p className="mt-5 text-2xl font-bold">
            {money(unit, product.currency)}
            {product.billing_type === "recurring" && (
              <span className="text-base font-normal text-muted-foreground">/{product.billing_interval ?? "month"}</span>
            )}
          </p>

          {variants.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-lg border px-3 py-2 text-sm ${variantId === v.id ? "border-primary bg-primary/5" : ""}`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => addToBasket(false)} variant="outline">Add to basket</Button>
            <Button onClick={() => addToBasket(true)} style={{ background: store.accent_color, color: "#0B1F3A" }}>
              {product.button_text || "Buy now"}
            </Button>
          </div>

          {product.description && (
            <div className="mt-8 whitespace-pre-line text-sm text-muted-foreground">{product.description}</div>
          )}
          {product.deliverables && (
            <div className="mt-6 rounded-xl border p-4 text-sm">
              <p className="font-medium">What you get</p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{product.deliverables}</p>
            </div>
          )}
        </div>
      </div>
    </StorefrontShell>
  );
}
