import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCY_LIST, CURRENCIES, type CurrencyCode } from "@/lib/currency/config";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type PlanKey = "starter" | "plus" | "pro" | "enterprise" | "credit_email" | "credit_sms" | "credit_whatsapp";

interface RegionalPriceRow {
  id?: string;
  plan_key: PlanKey;
  billing_cycle: "monthly" | "yearly" | "one_time";
  currency: CurrencyCode;
  amount_minor: number;
  stripe_price_id: string | null;
  paystack_plan_code: string | null;
  active: boolean;
}

interface RateRow { id?: string; quote: CurrencyCode; rate: number; }

const PLAN_LIST: { key: PlanKey; label: string; cycle: "monthly" | "yearly" | "one_time" }[] = [
  { key: "starter", label: "Starter (monthly)", cycle: "monthly" },
  { key: "starter", label: "Starter (yearly)", cycle: "yearly" },
  { key: "plus", label: "Plus (monthly)", cycle: "monthly" },
  { key: "plus", label: "Plus (yearly)", cycle: "yearly" },
  { key: "pro", label: "Pro (monthly)", cycle: "monthly" },
  { key: "pro", label: "Pro (yearly)", cycle: "yearly" },
  { key: "enterprise", label: "Enterprise (monthly)", cycle: "monthly" },
  { key: "enterprise", label: "Enterprise (yearly)", cycle: "yearly" },
  { key: "credit_email", label: "Email credit pack", cycle: "one_time" },
  { key: "credit_sms", label: "SMS credit pack", cycle: "one_time" },
  { key: "credit_whatsapp", label: "WhatsApp credit pack", cycle: "one_time" },
];

export default function AdminPricing() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RegionalPriceRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("regional_prices").select("*"),
      supabase.from("currency_rates").select("id, quote, rate").eq("base", "USD"),
    ]);
    if (p.data) setRows(p.data as RegionalPriceRow[]);
    if (r.data) setRates(r.data as RateRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const findRow = (plan: PlanKey, cycle: string, currency: CurrencyCode) =>
    rows.find((x) => x.plan_key === plan && x.billing_cycle === cycle && x.currency === currency);

  const getRate = (q: CurrencyCode) => rates.find((r) => r.quote === q)?.rate ?? (q === "USD" ? 1 : 1);

  const saveRow = async (row: RegionalPriceRow) => {
    const k = `${row.plan_key}:${row.billing_cycle}:${row.currency}`;
    setSavingKey(k);
    const payload = {
      plan_key: row.plan_key,
      billing_cycle: row.billing_cycle,
      currency: row.currency,
      amount_minor: row.amount_minor,
      stripe_price_id: row.stripe_price_id?.trim() || null,
      paystack_plan_code: row.paystack_plan_code?.trim() || null,
      active: row.active,
    };
    const { error } = await supabase
      .from("regional_prices")
      .upsert(payload, { onConflict: "plan_key,billing_cycle,currency" });
    setSavingKey(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    load();
  };

  const saveRate = async (quote: CurrencyCode, rate: number) => {
    const { error } = await supabase
      .from("currency_rates")
      .upsert({ base: "USD", quote, rate }, { onConflict: "base,quote" });
    if (error) { toast.error(error.message); return; }
    toast.success(`${quote} rate updated`);
    load();
  };

  const autofillFromUsd = (plan: PlanKey, cycle: string, currency: CurrencyCode) => {
    if (currency === "USD") return;
    const usd = findRow(plan, cycle, "USD");
    if (!usd) { toast.error("Set USD price first"); return; }
    const rate = getRate(currency);
    const converted = Math.round(usd.amount_minor * rate);
    const existing = findRow(plan, cycle, currency);
    const next: RegionalPriceRow = {
      ...(existing ?? {
        plan_key: plan,
        billing_cycle: cycle as RegionalPriceRow["billing_cycle"],
        currency,
        amount_minor: 0,
        stripe_price_id: null,
        paystack_plan_code: null,
        active: true,
      }),
      amount_minor: converted,
    };
    saveRow(next);
  };

  const filteredCurrencies = useMemo(() => CURRENCY_LIST, []);

  return (
    <DashboardLayout>
      <Seo title="Admin · Regional Pricing" description="Manage multi-currency pricing and FX rates." />
      <div className="container max-w-6xl space-y-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Regional Pricing</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage base pricing, currency-specific overrides, payment provider IDs and FX rates used for display conversion.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>FX rates (base: USD)</CardTitle>
            <CardDescription>Used to convert displayed prices when a currency-specific override is not set.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {filteredCurrencies.map((c) => {
                const current = rates.find((r) => r.quote === c.code)?.rate ?? 1;
                return (
                  <RateEditor key={c.code} code={c.code} initial={current} onSave={(v) => saveRate(c.code, v)} disabled={c.code === "USD"} />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Subscription plans</TabsTrigger>
            <TabsTrigger value="credits">Credit packs</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4 pt-4">
            {PLAN_LIST.filter(p => p.cycle !== "one_time").map((p) => (
              <PriceMatrix
                key={`${p.key}-${p.cycle}`}
                title={p.label}
                planKey={p.key}
                cycle={p.cycle}
                rows={rows}
                onSave={saveRow}
                onAutofill={autofillFromUsd}
                savingKey={savingKey}
                loading={loading}
              />
            ))}
          </TabsContent>

          <TabsContent value="credits" className="space-y-4 pt-4">
            {PLAN_LIST.filter(p => p.cycle === "one_time").map((p) => (
              <PriceMatrix
                key={p.key}
                title={p.label}
                planKey={p.key}
                cycle={p.cycle}
                rows={rows}
                onSave={saveRow}
                onAutofill={autofillFromUsd}
                savingKey={savingKey}
                loading={loading}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function RateEditor({ code, initial, onSave, disabled }: { code: CurrencyCode; initial: number; onSave: (v: number) => void; disabled?: boolean }) {
  const [val, setVal] = useState(String(initial));
  useEffect(() => setVal(String(initial)), [initial]);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span>{CURRENCIES[code].flag}</span>
        <span>1 USD = ? {code}</span>
      </div>
      <div className="flex gap-2">
        <Input type="number" step="0.0001" value={val} onChange={(e) => setVal(e.target.value)} disabled={disabled} />
        <Button size="sm" variant="outline" onClick={() => onSave(Number(val))} disabled={disabled || !val || isNaN(Number(val))}>
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface MatrixProps {
  title: string;
  planKey: PlanKey;
  cycle: "monthly" | "yearly" | "one_time";
  rows: RegionalPriceRow[];
  onSave: (row: RegionalPriceRow) => void;
  onAutofill: (plan: PlanKey, cycle: string, currency: CurrencyCode) => void;
  savingKey: string | null;
  loading: boolean;
}

function PriceMatrix({ title, planKey, cycle, rows, onSave, onAutofill, savingKey, loading }: MatrixProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Amount (minor units)</TableHead>
              <TableHead>Stripe price ID</TableHead>
              <TableHead>Paystack plan code</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CURRENCY_LIST.map((c) => {
              const row = rows.find((x) => x.plan_key === planKey && x.billing_cycle === cycle && x.currency === c.code) ?? {
                plan_key: planKey, billing_cycle: cycle, currency: c.code as CurrencyCode,
                amount_minor: 0, stripe_price_id: null, paystack_plan_code: null, active: true,
              };
              return (
                <PriceRow
                  key={c.code}
                  row={row}
                  onSave={onSave}
                  onAutofill={() => onAutofill(planKey, cycle, c.code as CurrencyCode)}
                  saving={savingKey === `${planKey}:${cycle}:${c.code}`}
                  loading={loading}
                />
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PriceRow({ row, onSave, onAutofill, saving, loading }: { row: RegionalPriceRow; onSave: (r: RegionalPriceRow) => void; onAutofill: () => void; saving: boolean; loading: boolean }) {
  const [draft, setDraft] = useState<RegionalPriceRow>(row);
  useEffect(() => setDraft(row), [row.amount_minor, row.stripe_price_id, row.paystack_plan_code, row.active]);
  const isNgn = row.currency === "NGN";
  const isUsd = row.currency === "USD";
  return (
    <TableRow>
      <TableCell><span className="mr-1">{CURRENCIES[row.currency].flag}</span>{row.currency}</TableCell>
      <TableCell>
        <Input type="number" value={draft.amount_minor} onChange={(e) => setDraft({ ...draft, amount_minor: Number(e.target.value) || 0 })} className="w-32" />
      </TableCell>
      <TableCell>
        <Input
          placeholder={isNgn ? "n/a" : "price_..."}
          value={draft.stripe_price_id ?? ""}
          onChange={(e) => setDraft({ ...draft, stripe_price_id: e.target.value })}
          disabled={isNgn}
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder={isNgn ? "PLN_..." : "n/a"}
          value={draft.paystack_plan_code ?? ""}
          onChange={(e) => setDraft({ ...draft, paystack_plan_code: e.target.value })}
          disabled={!isNgn}
        />
      </TableCell>
      <TableCell><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /></TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          {!isUsd && (
            <Button size="sm" variant="ghost" onClick={onAutofill} disabled={loading} title="Auto-fill amount from USD × FX rate">
              Auto
            </Button>
          )}
          <Button size="sm" onClick={() => onSave(draft)} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
