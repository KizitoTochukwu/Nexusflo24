import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useStorePrice } from "@/lib/store/price";
import { useStorePlans } from "@/hooks/useStore";

export default function StoreCart() {
  const navigate = useNavigate();
  const { format } = useStorePrice();
  const { data: plans = [] } = useStorePlans();
  const {
    items, plan, setPlan, removeItem, setQuantity, oneTimeTotalPence, monthlyTotalPence,
  } = useCart();

  return (
    <Layout>
      <Seo
        title="Your Automation Cart | NexusFlo24"
        description="Review your selected automations, add ongoing management and continue to secure checkout."
      />
      <section className="bg-background py-14">
        <div className="container mx-auto max-w-5xl px-4">
          <h1 className="text-3xl font-bold md:text-4xl">Your cart</h1>
          <p className="mt-2 text-muted-foreground">
            One-time setup and monthly management are shown separately, so you always know what you pay.
          </p>

          {items.length === 0 ? (
            <div className="mt-10 rounded-2xl border bg-surface p-12 text-center">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse the store and configure an automation to add it here.
              </p>
              <Button asChild className="mt-6">
                <Link to="/automations/all">Browse automations</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.key} className="rounded-xl border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">{item.name}</h2>
                        {item.deliveryEstimate && (
                          <p className="text-xs text-muted-foreground">Delivery: {item.deliveryEstimate}</p>
                        )}
                        {Object.keys(item.configuration ?? {}).length > 0 && (
                          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                            {Object.entries(item.configuration).slice(0, 6).map(([k, v]) => (
                              <li key={k}>
                                <span className="capitalize">{k.replace(/_/g, " ")}</span>:{" "}
                                {Array.isArray(v) ? v.join(", ") : String(v)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{format(item.unitPricePence * item.quantity)}</p>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQuantity(item.key, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQuantity(item.key, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => removeItem(item.key)}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border bg-surface p-5">
                  <h2 className="font-semibold">Ongoing management (optional)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitoring, adjustments and support after go-live. Billed monthly, cancel anytime.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {plans.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() =>
                          setPlan(
                            plan?.slug === p.slug
                              ? null
                              : { slug: p.slug, name: p.name, pricePence: p.price_pence },
                          )
                        }
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                          plan?.slug === p.slug ? "border-accent bg-accent/5" : "hover:bg-muted"
                        }`}
                      >
                        <span className="block font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(p.price_pence)}/month
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="h-fit rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
                <h2 className="font-semibold">Order summary</h2>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">One-time setup</span>
                  <span className="font-semibold">{format(oneTimeTotalPence)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly management</span>
                  <span className="font-semibold">
                    {monthlyTotalPence ? `${format(monthlyTotalPence)}/mo` : "—"}
                  </span>
                </div>
                <Button className="mt-6 w-full" onClick={() => navigate("/automations/checkout")}>
                  Continue to checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  {chargeCurrency === currency
                    ? `Secure payment by Stripe in ${currency}. Setup begins once onboarding is complete.`
                    : `${currency} is not supported by our card processor, so payment is taken securely in GBP.`}
                </p>
                <ul className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                  {ORDER_ASSURANCE.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
