import { Star, BadgeCheck } from "lucide-react";
import { summariseRatings, useProductReviews } from "@/hooks/useStoreReviews";

export function StarRow({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({ productSlug }: { productSlug: string }) {
  const { data: reviews = [], isLoading } = useProductReviews(productSlug);
  const { count, average } = summariseRatings(reviews);

  if (isLoading || count === 0) return null;

  return (
    <section className="bg-background py-14">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Customer reviews</span>
            <h2 className="mt-2 text-2xl font-bold">What customers say after go-live</h2>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <span className="text-3xl font-bold">{average.toFixed(1)}</span>
            <div>
              <StarRow rating={average} />
              <p className="text-xs text-muted-foreground">
                {count} verified {count === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <article key={review.id} className="rounded-xl border bg-card p-5 shadow-card">
              <StarRow rating={review.rating} />
              {review.title && <h3 className="mt-3 font-semibold">{review.title}</h3>}
              {review.body && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
              )}
              <footer className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{review.author_name}</span>
                {review.business_name && <span>· {review.business_name}</span>}
                {review.is_verified && (
                  <span className="ml-auto inline-flex items-center gap-1 text-accent">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified customer
                  </span>
                )}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
