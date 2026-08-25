import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2, RefreshCw, Repeat } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { money, orderStatusLabel, usePublicOrder, usePublicStore } from "@/hooks/useStorefront";

const emailKey = (orderId: string) => `nf24-shop-order-email:${orderId}`;

export default function StorefrontOrder() {
  const { storeSlug, orderId } = useParams<{ storeSlug: string; orderId: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { data: store } = usePublicStore(storeSlug);

  const [email, setEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fromUrl = params.get("email");
    const stored = localStorage.getItem(emailKey(orderId));
    const resolved = fromUrl || stored || user?.email || null;
    if (resolved) {
      setEmail(resolved);
      localStorage.setItem(emailKey(orderId), resolved);
    }
  }, [orderId, params, user?.email]);

  const { data: order, isLoading, isError, refetch, isFetching } = usePublicOrder(
    orderId,
    email,
    !!email || !!user,
  );

  const download = async (fileId: string) => {
    setBusy(fileId);
    try {
      const { data, error } = await supabase.functions.invoke("shop-download-url", {
        body: { orderId, fileId, email: email ?? order?.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create the download link.");
    } finally {
      setBusy(null);
    }
  };

  const manageSubscription = async () => {
    setBusy("subscription");
    try {
      const { data, error } = await supabase.functions.invoke("shop-customer-portal", {
        body: { orderId, email: email ?? order?.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open the billing portal.");
      setBusy(null);
    }
  };

  if (!store) return <div className="p-10"><Skeleton className="h-64" /></div>;

  // Guest with no email yet — ask them to prove ownership of the order.
  if (!email && !user) {
    return (
      <StorefrontShell store={store}>
        <Seo title={`Your order | ${store.name}`} description="Look up your order and downloads." />
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-8">
          <h1 className="text-xl font-bold">View your order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email address you used at checkout.
          </p>
          <div className="mt-5">
            <Label htmlFor="lookup-email">Email address</Label>
            <Input
              id="lookup-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              if (!emailInput.includes("@")) {
                toast.error("Please enter a valid email address.");
                return;
              }
              localStorage.setItem(emailKey(orderId!), emailInput.trim());
              setEmail(emailInput.trim());
            }}
          >
            View order
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  if (isLoading) return <div className="p-10"><Skeleton className="h-64" /></div>;

  if (isError || !order) {
    return (
      <StorefrontShell store={store}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not match that order to this email address.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => {
              localStorage.removeItem(emailKey(orderId!));
              setEmail(null);
              setEmailInput("");
            }}
          >
            Try another email
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  const paid = order.status === "paid" || order.status === "partially_refunded";

  return (
    <StorefrontShell store={store}>
      <Seo title={`Order ${order.order_number} | ${store.name}`} description="Your order details and downloads." />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-8 text-center">
          {paid
            ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            : <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />}
          <h1 className="mt-4 text-2xl font-bold">
            {paid ? "Thank you for your order" : "We are confirming your payment"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order {order.order_number} · {orderStatusLabel(order.status)}
            {order.fulfilment_status ? ` · ${order.fulfilment_status.replace(/_/g, " ")}` : ""}
          </p>
          {!paid && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Check again
            </Button>
          )}
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-6 text-sm">
          <ul className="space-y-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.name} × {i.quantity}</span>
                <span>{money(i.total_amount, order.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t pt-3 text-muted-foreground">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal_amount, order.currency)}</dd></div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between"><dt>Discount</dt><dd>−{money(order.discount_amount, order.currency)}</dd></div>
            )}
            {order.shipping_amount > 0 && (
              <div className="flex justify-between"><dt>Shipping</dt><dd>{money(order.shipping_amount, order.currency)}</dd></div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between"><dt>Tax</dt><dd>{money(order.tax_amount, order.currency)}</dd></div>
            )}
            {order.refunded_amount > 0 && (
              <div className="flex justify-between"><dt>Refunded</dt><dd>−{money(order.refunded_amount, order.currency)}</dd></div>
            )}
          </dl>
          <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span>{money(order.total_amount, order.currency)}</span>
          </div>
        </div>

        {paid && order.files.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Your downloads</h2>
            <ul className="mt-3 space-y-2">
              {order.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{f.file_name}</span>
                  <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => download(f.id)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {order.stripe_subscription_id && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border bg-card p-6">
            <div>
              <h2 className="font-semibold">Recurring plan</h2>
              <p className="text-sm text-muted-foreground">Update payment details or cancel any time.</p>
            </div>
            <Button variant="outline" onClick={manageSubscription} disabled={busy === "subscription"}>
              <Repeat className="mr-2 h-4 w-4" /> Manage
            </Button>
          </div>
        )}

        {order.shipping_address?.line1 && (
          <div className="mt-6 rounded-2xl border bg-card p-6 text-sm">
            <h2 className="font-semibold">Delivery address</h2>
            <p className="mt-2 text-muted-foreground">
              {[order.shipping_address.line1, order.shipping_address.city, order.shipping_address.postal_code, order.shipping_address.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button asChild variant="ghost" className="flex-1">
            <Link to={`/s/${store.slug}`}>Continue shopping</Link>
          </Button>
          <Button asChild variant="ghost" className="flex-1">
            <Link to={`/s/${store.slug}/account`}>My purchases</Link>
          </Button>
        </div>
      </div>
    </StorefrontShell>
  );
}
