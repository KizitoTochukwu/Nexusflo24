import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { supabase } from "@/integrations/supabase/client";
import { money, useBasket, usePublicStore } from "@/hooks/useStorefront";

export default function StorefrontCheckout() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { data: store } = usePublicStore(storeSlug);
  const basket = useBasket(storeSlug);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    line1: "",
    city: "",
    postal_code: "",
    country: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (!store) return <div className="p-10"><Skeleton className="h-64" /></div>;

  const needsShipping = basket.lines.some((l) => l.requiresShipping);

  const pay = async () => {
    if (!form.full_name.trim() || !form.email.includes("@")) {
      toast.error("Please add your name and a valid email address.");
      return;
    }
    if (needsShipping && (!form.line1 || !form.city || !form.postal_code || !form.country)) {
      toast.error("Please complete your delivery address.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("shop-checkout", {
        body: {
          storeSlug: store.slug,
          items: basket.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? null,
            quantity: l.quantity,
          })),
          discountCode: discountCode.trim() || null,
          customer: {
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            notes: form.notes,
            country: form.country,
            address: needsShipping
              ? {
                line1: form.line1,
                city: form.city,
                postal_code: form.postal_code,
                country: form.country,
              }
              : {},
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url || !data?.orderId) throw new Error("Checkout could not be started.");
      localStorage.setItem(`nf24-shop-order-email:${data.orderId}`, form.email.trim().toLowerCase());
      // Keep the basket until the order is confirmed paid, so a cancelled or
      // abandoned Stripe session returns the shopper to a full basket.
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message ?? "We could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  if (!basket.lines.length) {
    return (
      <StorefrontShell store={store}>
        <Seo title={`Checkout | ${store.name}`} description={`Complete your order with ${store.name}.`} />
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Your basket is empty</h1>
          <Button asChild className="mt-6"><Link to={`/s/${store.slug}`}>Continue shopping</Link></Button>
        </div>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell store={store} basketCount={basket.count}>
      <Seo title={`Checkout | ${store.name}`} description={`Securely complete your order with ${store.name}.`} />
      <h1 className="text-3xl font-bold">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Full name</Label>
              <Input id="c-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-phone">Phone (optional)</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          {needsShipping && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="c-line1">Address</Label>
                <Input id="c-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-city">City</Label>
                <Input id="c-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-post">Postcode</Label>
                <Input id="c-post" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-country">Country code (e.g. GB)</Label>
                <Input id="c-country" value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="c-notes">Order notes (optional)</Label>
            <Textarea id="c-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-6 lg:sticky lg:top-6">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {basket.lines.map((l) => (
              <li key={`${l.productId}-${l.variantId ?? ""}`} className="flex items-start justify-between gap-3">
                <div>
                  <p>{l.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      className="h-7 w-16"
                      value={l.quantity}
                      onChange={(e) => basket.setQuantity(l.productId, l.variantId ?? null, Number(e.target.value))}
                    />
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => basket.remove(l.productId, l.variantId ?? null)}
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <span className="font-medium">{money(l.unitAmount * l.quantity, store.currency)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t pt-4">
            <Label htmlFor="c-discount">Discount code</Label>
            <Input id="c-discount" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
            <span>Subtotal</span>
            <span>{money(basket.subtotal, store.currency)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Shipping and any discount are calculated securely at payment.
          </p>

          <Button className="mt-6 w-full" onClick={pay} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Pay securely
          </Button>
        </aside>
      </div>
    </StorefrontShell>
  );
}
