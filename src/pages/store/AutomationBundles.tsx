import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading, StoreCta } from "@/components/store/StorePrimitives";
import { useStorePrice } from "@/lib/store/price";
import {
  useStoreBundles, useStorePlans, useSubmitStoreRequest, type StoreBundle,
} from "@/hooks/useStore";

export default function AutomationBundles() {
  const { data: bundles = [] } = useStoreBundles();
  const { data: plans = [] } = useStorePlans();
  const { format } = useStorePrice();
  const submit = useSubmitStoreRequest();

  const [selected, setSelected] = useState<StoreBundle | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", business_name: "", message: "" });
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    if (!form.email.trim() || !form.full_name.trim()) {
      toast.error("Add your name and email so we can send your bundle scope.");
      return;
    }
    try {
      await submit.mutateAsync({
        request_type: "bundle",
        bundle_slug: selected.slug,
        full_name: form.full_name,
        email: form.email,
        business_name: form.business_name || null,
        message: form.message || null,
        estimated_price_pence: selected.price_pence,
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <Layout>
      <Seo
        title="Automation Bundles | Complete Systems for Your Business"
        description="Grouped automations that solve a whole business function together — lead engine, sales system, service desk and full business automation."
        path="/automation-bundles"
      />

      <section className="bg-hero py-16">
        <div className="container text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Automation Bundles</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Buy a complete system rather than a single workflow. Bundles are designed to work
            together, delivered as one project, and priced with a saving.
          </p>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="container grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="flex flex-col rounded-xl border bg-card p-6 shadow-card">
              {bundle.badge && (
                <Badge className="mb-3 w-fit bg-accent text-accent-foreground hover:bg-accent">
                  {bundle.badge}
                </Badge>
              )}
              <h2 className="text-lg font-semibold">{bundle.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{bundle.description}</p>
              {bundle.best_for && (
                <p className="mt-3 text-xs font-medium text-accent">Best for: {bundle.best_for}</p>
              )}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {bundle.includes?.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t pt-5">
                <p className="text-2xl font-bold">{format(bundle.price_pence)}</p>
                {bundle.saving_pence > 0 && (
                  <p className="text-xs font-medium text-accent">
                    Save {format(bundle.saving_pence)} versus buying separately
                  </p>
                )}
                {bundle.delivery_estimate && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {bundle.delivery_estimate}
                  </p>
                )}
                <Button
                  className="mt-4 w-full bg-accent text-accent-foreground hover:bg-gold-dark"
                  onClick={() => {
                    setDone(false);
                    setSelected(bundle);
                  }}
                >
                  Request this bundle
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="bg-surface py-14">
          <div className="container">
            <SectionHeading
              eyebrow="Ongoing care"
              title="Add a managed automation plan"
              subtitle="Optional monthly support so your automations keep performing as your business changes."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-bold">
                    {plan.price_prefix ? `${plan.price_prefix} ` : ""}
                    {format(plan.price_pence)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {plan.features?.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <StoreCta
        title="Want a bundle shaped around your business?"
        body="Tell us what you are trying to fix and we will design the right combination of automations."
        primary={{ label: "Build My Automation", to: "/build-my-automation" }}
        secondary={{ label: "Browse the catalogue", to: "/automations/all" }}
      />

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {done ? (
            <div className="py-6 text-center">
              <DialogTitle className="text-xl">Bundle request received</DialogTitle>
              <p className="mt-3 text-sm text-muted-foreground">
                We will review your business and send a confirmed scope, timeline and payment link
                for the {selected?.name}.
              </p>
              <Button className="mt-6" onClick={() => setSelected(null)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request {selected?.name}</DialogTitle>
                <DialogDescription>
                  Share a few details and we will confirm scope, timeline and price before anything
                  is charged.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bundle-name">Full name</Label>
                  <Input
                    id="bundle-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bundle-email">Business email</Label>
                  <Input
                    id="bundle-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bundle-business">Business name</Label>
                  <Input
                    id="bundle-business"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bundle-message">What do you want this to fix?</Label>
                  <Textarea
                    id="bundle-message"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-gold-dark"
                  onClick={handleSubmit}
                  disabled={submit.isPending}
                >
                  {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send request
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="sr-only">
        <Link to="/automations">Automation Store</Link>
      </div>
    </Layout>
  );
}
