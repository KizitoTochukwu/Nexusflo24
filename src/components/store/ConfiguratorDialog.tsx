import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CONFIG_SCHEMA } from "@/lib/store/constants";
import { useStorePrice } from "@/lib/store/price";
import { useStorePlans, useSubmitStoreRequest, type StoreProduct } from "@/hooks/useStore";

type Question = {
  id: string;
  label: string;
  type: "single" | "multi";
  options: string[];
  priceBy?: Record<string, number>;
  pricePerExtra?: number;
  included?: number;
};

export default function ConfiguratorDialog({
  product,
  open,
  onOpenChange,
}: {
  product: StoreProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { format } = useStorePrice();
  const { data: plans = [] } = useStorePlans();
  const submit = useSubmitStoreRequest();

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [details, setDetails] = useState({
    full_name: "", email: "", phone: "", business_name: "", website: "", message: "",
  });
  const [done, setDone] = useState(false);

  const questions: Question[] = useMemo(() => {
    const schema = Array.isArray(product?.config_schema) && product!.config_schema.length
      ? (product!.config_schema as Question[])
      : (DEFAULT_CONFIG_SCHEMA as Question[]);
    return schema;
  }, [product]);

  const extras = useMemo(() => {
    let total = 0;
    for (const q of questions) {
      const value = answers[q.id];
      if (!value) continue;
      if (q.type === "single" && typeof value === "string" && q.priceBy?.[value]) {
        total += q.priceBy[value];
      }
      if (q.type === "multi" && Array.isArray(value) && q.pricePerExtra) {
        const extraCount = Math.max(0, value.length - (q.included ?? 1));
        total += extraCount * q.pricePerExtra;
      }
    }
    return total;
  }, [answers, questions]);

  const base = product?.base_price_pence ?? 0;
  const estimate = base + extras;
  const plan = plans.find((p) => p.slug === planSlug);

  const toggleMulti = (id: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return {
        ...prev,
        [id]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  };

  const reset = () => {
    setAnswers({});
    setPlanSlug(null);
    setDetails({ full_name: "", email: "", phone: "", business_name: "", website: "", message: "" });
    setDone(false);
  };

  const handleSubmit = async () => {
    if (!product) return;
    if (!details.email.trim() || !details.full_name.trim()) {
      toast.error("Please add your name and email so we can send your setup plan.");
      return;
    }
    try {
      await submit.mutateAsync({
        request_type: "configuration",
        product_slug: product.slug,
        plan_slug: planSlug,
        full_name: details.full_name,
        email: details.email,
        phone: details.phone || null,
        business_name: details.business_name || null,
        website: details.website || null,
        message: details.message || null,
        answers: { ...answers, managed_plan: planSlug ?? "none" },
        estimated_price_pence: estimate,
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message || "We could not save your configuration. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-accent" />
            <DialogTitle className="text-2xl">Your configuration is saved</DialogTitle>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              We have everything we need to confirm your setup for {product?.name}. A member of the
              NexusFlo24 team will send your final scope and secure payment link shortly.
            </p>
            <p className="mt-4 text-sm">
              Estimated setup: <strong>{format(estimate)}</strong>
              {plan && (
                <>
                  {" "}
                  plus <strong>{format(plan.price_pence)}/month</strong> {plan.name}
                </>
              )}
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Configure {product?.name}</DialogTitle>
              <DialogDescription>
                Tell us how your business works today. Your estimate updates as you answer — there are
                no hidden costs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {questions.map((q) => (
                <div key={q.id}>
                  <Label className="mb-3 block text-sm font-semibold">{q.label}</Label>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => {
                      const selected =
                        q.type === "multi"
                          ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(option)
                          : answers[q.id] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            q.type === "multi"
                              ? toggleMulti(q.id, option)
                              : setAnswers((p) => ({ ...p, [q.id]: option }))
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            selected
                              ? "border-accent bg-accent/10 font-medium text-accent"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <Label className="mb-3 block text-sm font-semibold">
                  Add ongoing management? (optional)
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {plans.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setPlanSlug(planSlug === p.slug ? null : p.slug)}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        planSlug === p.slug ? "border-accent bg-accent/5" : "hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.price_prefix ? `${p.price_prefix} ` : ""}
                        {format(p.price_pence)}/month
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-surface p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base setup</span>
                  <span>{format(base)}</span>
                </div>
                {extras > 0 && (
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Configuration adjustments</span>
                    <span>+{format(extras)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">Estimated setup price</span>
                  <span className="text-xl font-bold">{format(estimate)}</span>
                </div>
                {plan && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{plan.name} (monthly, separate)</span>
                    <span className="font-medium">{format(plan.price_pence)}/month</span>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  One-time setup and monthly management are billed separately. We confirm the final
                  price in writing before anything is charged.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cfg-name">Full name</Label>
                  <Input
                    id="cfg-name"
                    value={details.full_name}
                    onChange={(e) => setDetails({ ...details, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cfg-email">Business email</Label>
                  <Input
                    id="cfg-email"
                    type="email"
                    value={details.email}
                    onChange={(e) => setDetails({ ...details, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cfg-business">Business name</Label>
                  <Input
                    id="cfg-business"
                    value={details.business_name}
                    onChange={(e) => setDetails({ ...details, business_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cfg-phone">Phone</Label>
                  <Input
                    id="cfg-phone"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cfg-website">Website</Label>
                  <Input
                    id="cfg-website"
                    value={details.website}
                    onChange={(e) => setDetails({ ...details, website: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cfg-notes">Anything else we should know?</Label>
                  <Textarea
                    id="cfg-notes"
                    rows={3}
                    value={details.message}
                    onChange={(e) => setDetails({ ...details, message: e.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 text-xs text-muted-foreground">
                <Checkbox className="mt-0.5" defaultChecked disabled />
                <span>
                  We will only use these details to prepare and deliver your automation. Never share
                  account passwords — we will send secure access instructions during onboarding.
                </span>
              </label>

              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-gold-dark"
                size="lg"
                onClick={handleSubmit}
                disabled={submit.isPending}
              >
                {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit configuration
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
