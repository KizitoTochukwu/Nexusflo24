import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/store/StorePrimitives";
import { useStorePrice } from "@/lib/store/price";
import type { StoreProduct } from "@/hooks/useStore";

export default function ProductCard({
  product,
  onConfigure,
}: {
  product: StoreProduct;
  onConfigure?: (product: StoreProduct) => void;
}) {
  const { format } = useStorePrice();

  return (
    <article className="group flex h-full flex-col rounded-xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="mb-4 flex items-start justify-between gap-3">
        <LevelBadge level={product.level} />
        {product.badge && (
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">{product.badge}</Badge>
        )}
      </div>

      <h3 className="text-lg font-semibold leading-snug">
        <Link to={`/automations/${product.slug}`} className="hover:text-accent">
          {product.name}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{product.outcome}</p>

      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium capitalize">
          {product.category_slug.replace(/-/g, " ")}
        </span>
        {product.delivery_estimate && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {product.delivery_estimate}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between border-t pt-5">
        <div>
          <span className="block text-xs text-muted-foreground">Starting from</span>
          <span className="text-xl font-bold">{format(product.base_price_pence)}</span>
        </div>
        <div className="flex gap-2">
          <Link to={`/automations/${product.slug}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-gold-dark"
            onClick={() => onConfigure?.(product)}
            asChild={!onConfigure}
          >
            {onConfigure ? (
              <span className="inline-flex items-center gap-1">
                Configure <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Link to={`/automations/${product.slug}`}>Configure</Link>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
