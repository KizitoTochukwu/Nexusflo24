import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import PricingFaq from "@/components/pricing/PricingFaq";
import PricingCtaBanner from "@/components/pricing/PricingCtaBanner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Zap, Loader2, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, CURRENCIES } from "@/lib/currency/config";
import {
  PLANS,
  type PlanKey,
  type BillingCycle,
  getDisplayPrice,
  getYearlyTotal,
  getYearlySavings,
} from "@/lib/stripe/plans";
import { PLAN_CREDITS } from "@/lib/stripe/creditPacks";
import CreditPackCards from "@/components/pricing/CreditPackCards";
import { toast } from "sonner";
import { fbqTrack } from "@/lib/analytics/metaPixel";
import { startSubscriptionCheckout } from "@/lib/billing/checkout";

interface PlanFeatureGroup {
  title: string;
  features: string[];
}

interface PricingTier {
  name: string;
  key: PlanKey;
  subtitle: string;
  featureGroups: PlanFeatureGroup[];
  highlight: boolean;
  badge?: string;
  trialNote?: string;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    key: "starter",
    subtitle: "For beginners getting their first lead system live",
    trialNote: "14-day free trial — no card required",
    highlight: false,
    featureGroups: [
      { title: "Capture", features: ["3 lead forms", "1 funnel page", "1 booking page"] },
      { title: "CRM & Pipeline", features: ["1,000 contacts", "Full CRM & pipeline", "Lead scoring & activity timeline"] },
      { title: "AI & Automation", features: ["15 AI copy generations/day", "2 active automations", "3 active campaigns"] },
      { title: "Communication Wallet", features: ["1,000 email credits/mo", "100 WhatsApp credits/mo", "Top up anytime"] },
      { title: "Insights", features: ["Core dashboard & lead reporting"] },
      { title: "Team", features: ["1 seat"] },
    ],
  },
  {
    name: "Plus",
    key: "plus",
    subtitle: "The clear upgrade for growing businesses and small teams",
    highlight: false,
    featureGroups: [
      { title: "Capture", features: ["15 lead forms", "5 funnel pages", "3 booking pages"] },
      { title: "CRM & Pipeline", features: ["5,000 contacts", "Smart lists & segments", "Lead routing rules"] },
      { title: "AI & Automation", features: ["100 AI copy generations/day", "10 active automations", "15 active campaigns", "Behaviour-triggered automations", "AI lead qualification"] },
      { title: "Communication Wallet", features: ["5,000 email credits/mo", "500 WhatsApp credits/mo", "250 SMS credits/mo"] },
      { title: "Insights", features: ["Campaign & funnel reporting"] },
      { title: "Team", features: ["3 seats"] },
    ],
  },
  {
    name: "Pro",
    key: "pro",
    subtitle: "Best value — the full stack for serious marketers",
    highlight: true,
    badge: "Most Popular",
    featureGroups: [
      { title: "Capture", features: ["50 lead forms", "20 funnel pages", "10 booking pages"] },
      { title: "CRM & Pipeline", features: ["25,000 contacts", "Smart lists & segments", "Lead routing rules"] },
      { title: "AI & Automation", features: ["500 AI copy generations/day", "50 active automations", "60 active campaigns", "Full automation builder", "AI Sales Closer & follow-ups"] },
      { title: "Communication Wallet", features: ["20,000 email credits/mo", "2,000 WhatsApp credits/mo", "1,000 SMS credits/mo"] },
      { title: "Insights", features: ["Advanced analytics & cohorts", "Data exports"] },
      { title: "Team & Advanced", features: ["10 seats", "AI Agent Connections (MCP)"] },
    ],
  },
  {
    name: "Enterprise",
    key: "enterprise",
    subtitle: "Sales-led, for agencies & high-volume senders",
    highlight: false,
    featureGroups: [
      { title: "Capture", features: ["250 lead forms", "100 funnel pages", "50 booking pages"] },
      { title: "CRM & Pipeline", features: ["100,000 contacts", "Custom volumes available"] },
      { title: "AI & Automation", features: ["2,000 AI copy generations/day", "250 active automations", "300 active campaigns", "Priority AI processing"] },
      { title: "Communication Wallet", features: ["75,000 email credits/mo", "6,000 WhatsApp credits/mo", "4,000 SMS credits/mo", "Custom top-up agreements"] },
      { title: "Insights", features: ["Advanced analytics & exports", "Multi-client reporting"] },
      { title: "Team & Advanced", features: ["50 seats", "Multi-client workspaces", "White-label dashboard & branding", "API access", "Dedicated account manager"] },
    ],
  },
];

const fmtCredits = (n: number) => (n === 0 ? "—" : n.toLocaleString());

const comparisonFeatures = [
  { name: "Lead forms", starter: "3", plus: "15", pro: "50", enterprise: "250" },
  { name: "Funnel pages", starter: "1", plus: "5", pro: "20", enterprise: "100" },
  { name: "Booking pages", starter: "1", plus: "3", pro: "10", enterprise: "50" },
  { name: "Contacts", starter: "1,000", plus: "5,000", pro: "25,000", enterprise: "100,000" },
  { name: "Smart lists & segments", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "Active campaigns", starter: "3", plus: "15", pro: "60", enterprise: "300" },
  { name: "Active automations", starter: "2", plus: "10", pro: "50", enterprise: "250" },
  { name: "AI copy generations", starter: "15/day", plus: "100/day", pro: "500/day", enterprise: "2,000/day" },
  { name: "Behaviour triggers", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "AI lead qualification", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "AI Sales Closer", starter: "—", plus: "—", pro: "✓", enterprise: "✓" },
  { name: "Email", starter: "✓", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "WhatsApp", starter: "✓", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "SMS", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "Wallet: email credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.email), plus: fmtCredits(PLAN_CREDITS.plus.email), pro: fmtCredits(PLAN_CREDITS.pro.email), enterprise: fmtCredits(PLAN_CREDITS.enterprise.email) },
  { name: "Wallet: WhatsApp credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.whatsapp), plus: fmtCredits(PLAN_CREDITS.plus.whatsapp), pro: fmtCredits(PLAN_CREDITS.pro.whatsapp), enterprise: fmtCredits(PLAN_CREDITS.enterprise.whatsapp) },
  { name: "Wallet: SMS credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.sms), plus: fmtCredits(PLAN_CREDITS.plus.sms), pro: fmtCredits(PLAN_CREDITS.pro.sms), enterprise: fmtCredits(PLAN_CREDITS.enterprise.sms) },
  { name: "Wallet top-ups", starter: "✓", plus: "✓", pro: "✓", enterprise: "Custom" },
  { name: "Analytics", starter: "Core", plus: "Campaign & funnel", pro: "Advanced", enterprise: "Advanced + multi-client" },
  { name: "Seats", starter: "1", plus: "3", pro: "10", enterprise: "50" },
  { name: "AI Agent Connections (MCP)", starter: "—", plus: "—", pro: "✓", enterprise: "✓" },
  { name: "Multi-client workspaces", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
  { name: "White-label & branding", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
  { name: "API access", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
];

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, convert } = useCurrency();
  const symbol = CURRENCIES[currency].symbol;

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/register?next=/pricing");
      return;
    }

    setLoadingPlan(planKey);
    const plan = PLANS[planKey];
    const usdMonthly = getDisplayPrice(plan.monthlyPrice, billingCycle);
    const valueUsd = billingCycle === "yearly" ? getYearlyTotal(plan.monthlyPrice) : plan.monthlyPrice;
    const localValue = convert(valueUsd);

    fbqTrack("InitiateCheckout", {
      content_name: planKey,
      content_category: "subscription",
      value: localValue,
      currency,
      num_items: 1,
    });

    try {
      // Resolve current workspace (best-effort)
      const { data: m } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
      const result = await startSubscriptionCheckout({
        planKey,
        billingCycle,
        currency,
        workspaceId: m?.workspace_id,
      });
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Layout>
      <Seo
        title="Pricing – Plans for Creators, Startups & Agencies"
        description="Simple monthly or yearly pricing. Start free for 14 days, then choose Starter, Plus, Pro or Enterprise. Every plan includes a Communication Wallet for email, WhatsApp and SMS."
      />
      {/* Hero */}
      <section className="bg-hero py-20 text-center">
        <div className="container">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
            <Zap className="h-3.5 w-3.5" /> Pricing
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-primary-foreground md:text-5xl">
            Plans That Scale <span className="text-gradient-gold">With You</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
            Start with a 14-day free trial on Starter. Upgrade anytime as your business grows.
          </p>

          {/* Billing Toggle */}
          <div className="mx-auto mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium ${
                billingCycle === "monthly"
                  ? "text-primary-foreground"
                  : "text-primary-foreground/50"
              }`}
            >
              Monthly
            </span>
            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) =>
                setBillingCycle(checked ? "yearly" : "monthly")
              }
            />
            <span
              className={`text-sm font-medium ${
                billingCycle === "yearly"
                  ? "text-primary-foreground"
                  : "text-primary-foreground/50"
              }`}
            >
              Yearly
            </span>
            <Badge className="bg-accent text-accent-foreground text-xs">Save 20%</Badge>
          </div>
        </div>
      </section>

      

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => {
              const plan = PLANS[tier.key];
              const displayPrice = getDisplayPrice(plan.monthlyPrice, billingCycle);
              const savings = getYearlySavings(plan.monthlyPrice);

              return (
                <div
                  key={tier.name}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg ${
                    tier.highlight
                      ? "border-accent bg-card shadow-gold ring-2 ring-accent/20"
                      : "bg-card shadow-card"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                      <Crown className="h-3 w-3" />
                      {tier.badge}
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {tier.subtitle}
                    </p>
                  </div>

                  <div className="mb-1">
                    <span className="text-4xl font-extrabold">{formatPrice(convert(displayPrice), currency, { compact: true })}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>

                  {tier.trialNote && billingCycle === "monthly" ? (
                    <p className="mb-4 text-xs font-medium text-accent">{tier.trialNote}</p>
                  ) : billingCycle === "yearly" ? (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Billed {formatPrice(convert(getYearlyTotal(plan.monthlyPrice)), currency, { compact: true })}/yr&nbsp;
                      <span className="font-semibold text-accent">
                        — Save {formatPrice(convert(savings), currency, { compact: true })}/yr
                      </span>
                    </p>
                  ) : (
                    <p className="mb-4 text-xs text-muted-foreground">Billed monthly</p>
                  )}

                  <div className="mb-6 flex-1 space-y-4">
                    {tier.featureGroups.map((group) => (
                      <div key={group.title}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.title}
                        </p>
                        <ul className="space-y-1.5">
                          {group.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full ${
                      tier.highlight
                        ? "bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                        : ""
                    }`}
                    variant={tier.highlight ? "default" : "outline"}
                    disabled={loadingPlan === tier.key}
                    onClick={() =>
                      tier.key === "enterprise"
                        ? navigate("/contact?plan=enterprise")
                        : handleSubscribe(tier.key)
                    }
                  >
                    {loadingPlan === tier.key ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      tier.key === "enterprise" ? "Talk to Sales" : "Buy Now"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CreditPackCards />

      {/* Feature Comparison */}
      <section className="bg-surface py-20">
        <div className="container">
          <h2 className="mb-8 text-center text-2xl font-bold">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold">Starter</th>
                  <th className="px-4 py-3 text-center font-semibold">Plus</th>
                  <th className="px-4 py-3 text-center font-semibold text-accent">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((f) => (
                  <tr key={f.name} className="border-b">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{f.starter}</td>
                    <td className="px-4 py-3 text-center">{f.plus}</td>
                    <td className="px-4 py-3 text-center font-medium">{f.pro}</td>
                    <td className="px-4 py-3 text-center">{f.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <PricingFaq />

      {/* CTA Banner */}
      <PricingCtaBanner />
    </Layout>
  );
};

export default Pricing;
