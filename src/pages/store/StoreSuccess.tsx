import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useStoreOrder } from "@/hooks/useStoreOrders";
import { useStorePrice } from "@/lib/store/price";
import { DELIVERY_STEPS } from "@/lib/store/constants";

export default function StoreSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("order") ?? undefined;
  const { clear } = useCart();
  const { format } = useStorePrice();
  const { data, isLoading } = useStoreOrder(orderId);

  useEffect(() => {
    clear();
  }, [clear]);

  const order = data?.order;
  const items = data?.items ?? [];

  return (
    <Layout>
      <Seo
        title="Order confirmed | NexusFlo24 Automation Store"
        description="Your automation order is confirmed. Next step: complete onboarding so our team can begin the build."
      />
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-accent" />
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">Thank you — your order is in</h1>
          <p className="mt-3 text-muted-foreground">
            We have emailed your receipt. The next step is onboarding: share the business details and
            access we need, and our team starts the build.
          </p>

          <div className="mt-8 rounded-2xl border bg-card p-6 text-left">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming your payment…
              </div>
            ) : order ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Order {order.id.slice(0, 8).toUpperCase()}</h2>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {order.status === "paid" ? "Payment received" : "Awaiting payment confirmation"}
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {i.name}
                        {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                      </span>
                      <span>{format(i.unit_price_pence * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-between border-t pt-4 text-sm">
                  <span className="font-medium">One-time setup</span>
                  <span className="font-semibold">{format(order.total_pence)}</span>
                </div>
                {order.monthly_total_pence > 0 && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="font-medium">Managed plan</span>
                    <span className="font-semibold">{format(order.monthly_total_pence)}/month</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                We could not load this order here, but your payment is safe. Our team will contact you by email.
              </p>
            )}
          </div>

          <div className="mt-8 rounded-2xl border bg-surface p-6 text-left">
            <h2 className="font-semibold">What happens next</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {DELIVERY_STEPS.map((step, idx) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <span className="text-sm">
                    <strong className="block">{step.title}</strong>
                    <span className="text-muted-foreground">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Go to My Automations</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/automations/all">Browse more automations</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
