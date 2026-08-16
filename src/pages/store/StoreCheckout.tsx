import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useStorePrice } from "@/lib/store/price";

export default function StoreCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { format } = useStorePrice();
  const { items, plan, oneTimeTotalPence, monthlyTotalPence } = useCart();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: (user?.user_metadata as any)?.full_name ?? "",
    email: user?.email ?? "",
    phone: "",
    business_name: "",
    website: "",
    industry: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCheckout = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Please add your name and business email.");
      return;
    }
    if (!items.length) {
      toast.error("Your cart is empty.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("store-checkout", {
        body: {
          items: items.map((i) => ({
            kind: i.kind,
            slug: i.slug,
            name: i.name,
            unitPricePence: i.unitPricePence,
            quantity: i.quantity,
            configuration: i.configuration,
          })),
          plan: plan ? { slug: plan.slug, name: plan.name, pricePence: plan.pricePence } : null,
          customer: form,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Checkout could not be started.");
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || "We could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <Layout>
        <Seo title="Checkout | NexusFlo24 Automation Store" description="Complete your automation order." />
        <section className="bg-background py-20">
          <div className="container mx-auto max-w-2xl px-4 text-center">
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <Button asChild className="mt-6">
              <Link to="/automations/all">Browse automations</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title="Checkout | NexusFlo24 Automation Store"
        description="Securely complete your automation setup order with Stripe."
      />
      <section className="bg-background py-14">
        <div className="container mx-auto max-w-5xl px-4">
          <h1 className="text-3xl font-bold md:text-4xl">Checkout</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us where the automation lives, then pay securely. Onboarding starts immediately after payment.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="co-name">Full name</Label>
                  <Input id="co-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="co-email">Business email</Label>
                  <Input id="co-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="co-phone">Phone (optional)</Label>
                  <Input id="co-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="co-business">Business name</Label>
                  <Input id="co-business" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="co-website">Website (optional)</Label>
                  <Input id="co-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="co-industry">Industry (optional)</Label>
                  <Input id="co-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="co-notes">Anything we should know? (optional)</Label>
                <Textarea id="co-notes" rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
              {!user && (
                <p className="text-xs text-muted-foreground">
                  Tip: <Link to="/login" className="underline">sign in</Link> before paying so your automation
                  projects appear in your dashboard automatically.
                </p>
              )}
            </div>

            <aside className="h-fit rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
              <h2 className="font-semibold">Order summary</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {items.map((i) => (
                  <li key={i.key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {i.name}
                      {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                    </span>
                    <span>{format(i.unitPricePence * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">One-time setup</span>
                  <span className="font-semibold">{format(oneTimeTotalPence)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {plan ? `${plan.name} (monthly)` : "Monthly management"}
                  </span>
                  <span className="font-semibold">
                    {monthlyTotalPence ? `${format(monthlyTotalPence)}/mo` : "—"}
                  </span>
                </div>
              </div>
              <Button className="mt-6 w-full" onClick={handleCheckout} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Pay securely
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Charged in GBP by Stripe. Other currencies are shown as a guide only.
              </p>
              <Button asChild variant="ghost" className="mt-2 w-full" onClick={() => navigate("/automations/cart")}>
                <Link to="/automations/cart">Back to cart</Link>
              </Button>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
}
