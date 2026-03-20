import Layout from "@/components/layout/Layout";
import PricingFaq from "@/components/pricing/PricingFaq";
import PricingCtaBanner from "@/components/pricing/PricingCtaBanner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Zap, Loader2, Crown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  PLANS,
  type PlanKey,
  type BillingCycle,
  getDisplayPrice,
  getYearlyTotal,
  getYearlySavings,
} from "@/lib/stripe/plans";
import { PLAN_CREDITS, CREDIT_PACKS } from "@/lib/stripe/creditPacks";
import { toast } from "sonner";

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
    subtitle: "For solopreneurs & side hustlers just getting started",
    trialNote: "14-day free trial — no card required",
    highlight: false,
    featureGroups: [
      {
        title: "Core Platform",
        features: [
          "Up to 250 contacts",
          "1 funnel page",
          "2 active campaigns",
          "Basic CRM & pipeline",
        ],
      },
      { title: "AI-Powered", features: ["10 AI copy generations/day"] },
      { title: "Channels", features: ["Email only"] },
      { title: "Monthly Credits", features: ["500 email credits"] },
    ],
  },
  {
    name: "Plus",
    key: "plus",
    subtitle: "For growing businesses scaling their outreach",
    highlight: false,
    featureGroups: [
      {
        title: "Core Platform",
        features: [
          "Up to 2,500 contacts",
          "3 funnel pages",
          "10 active campaigns",
          "Full CRM & pipeline",
          "Nurture Flow Builder",
        ],
      },
      {
        title: "AI-Powered",
        features: ["50 AI copy generations/day", "Behaviour-triggered automations"],
      },
      { title: "Channels", features: ["Email + WhatsApp"] },
      { title: "Monthly Credits", features: ["2,500 email", "100 SMS", "100 WhatsApp"] },
    ],
  },
  {
    name: "Pro",
    key: "pro",
    subtitle: "For serious marketers who want everything",
    highlight: true,
    badge: "Most Popular",
    featureGroups: [
      {
        title: "Core Platform",
        features: [
          "Unlimited contacts",
          "10 funnel pages",
          "Unlimited campaigns",
          "Full CRM & pipeline",
          "Nurture Flow Builder",
          "Team invites & collaboration",
        ],
      },
      {
        title: "AI-Powered",
        features: [
          "Unlimited AI copy generation",
          "Behaviour-triggered automations",
          "Advanced analytics & reporting",
        ],
      },
      { title: "Channels", features: ["Email + WhatsApp + SMS"] },
      { title: "Monthly Credits", features: ["10,000 email", "500 SMS", "500 WhatsApp"] },
    ],
  },
  {
    name: "Enterprise",
    key: "enterprise",
    subtitle: "For agencies & teams managing multiple clients",
    highlight: false,
    featureGroups: [
      {
        title: "Core Platform",
        features: ["Everything in Pro", "Unlimited funnels", "Multi-client workspaces"],
      },
      {
        title: "AI-Powered",
        features: ["Unlimited AI across all tools", "Priority AI processing"],
      },
      { title: "Channels", features: ["All channels + priority delivery"] },
      {
        title: "Advanced",
        features: [
          "White-label dashboard",
          "Custom branding",
          "API access",
          "Dedicated account manager",
        ],
      },
    ],
  },
];

const fmtCredits = (n: number) => (n === 0 ? "—" : n.toLocaleString());

const comparisonFeatures = [
  { name: "Contacts", starter: "250", plus: "2,500", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Funnels", starter: "1", plus: "3", pro: "10", enterprise: "Unlimited" },
  { name: "Campaigns", starter: "2", plus: "10", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Email Credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.email), plus: fmtCredits(PLAN_CREDITS.plus.email), pro: fmtCredits(PLAN_CREDITS.pro.email), enterprise: fmtCredits(PLAN_CREDITS.enterprise.email) },
  { name: "SMS Credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.sms), plus: fmtCredits(PLAN_CREDITS.plus.sms), pro: fmtCredits(PLAN_CREDITS.pro.sms), enterprise: fmtCredits(PLAN_CREDITS.enterprise.sms) },
  { name: "WhatsApp Credits/mo", starter: fmtCredits(PLAN_CREDITS.starter.whatsapp), plus: fmtCredits(PLAN_CREDITS.plus.whatsapp), pro: fmtCredits(PLAN_CREDITS.pro.whatsapp), enterprise: fmtCredits(PLAN_CREDITS.enterprise.whatsapp) },
  { name: "Email", starter: "✓", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "WhatsApp", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "SMS", starter: "—", plus: "—", pro: "✓", enterprise: "✓" },
  { name: "AI Copywriter", starter: "10/day", plus: "50/day", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Nurture Flows", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "Behaviour Triggers", starter: "—", plus: "✓", pro: "✓", enterprise: "✓" },
  { name: "Analytics", starter: "Basic", plus: "Basic", pro: "Advanced", enterprise: "Advanced+" },
  { name: "Team Invites", starter: "—", plus: "—", pro: "✓", enterprise: "✓" },
  { name: "Multi-Workspace", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
  { name: "White-Label", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
  { name: "API Access", starter: "—", plus: "—", pro: "—", enterprise: "✓" },
];

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/register?next=/pricing");
      return;
    }

    setLoadingPlan(planKey);
    const plan = PLANS[planKey];
    const priceId =
      billingCycle === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan: planKey, billingCycle, priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Layout>
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
      <section className="-mt-8 pb-20">
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
                    <span className="text-4xl font-extrabold">${displayPrice}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>

                  {/* Billing descriptor */}
                  {tier.trialNote && billingCycle === "monthly" ? (
                    <p className="mb-4 text-xs font-medium text-accent">{tier.trialNote}</p>
                  ) : billingCycle === "yearly" ? (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Billed ${getYearlyTotal(plan.monthlyPrice)}/yr&nbsp;
                      <span className="font-semibold text-accent">
                        — Save ${savings}/yr
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
                    onClick={() => handleSubscribe(tier.key)}
                  >
                    {loadingPlan === tier.key ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      "Buy Now"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

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

      {/* Credit Top-Up Packs */}
      <section className="py-16">
        <div className="container">
          <h2 className="mb-2 text-center text-2xl font-bold">Need More Credits?</h2>
          <p className="mx-auto mb-8 max-w-md text-center text-muted-foreground">
            Purchase additional credit packs anytime — no subscription change required.
          </p>
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-3">
            {(["email", "sms", "whatsapp"] as const).map((ch) => {
              const pack = CREDIT_PACKS[ch];
              return (
                <div
                  key={ch}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center shadow-card"
                >
                  <Badge variant="outline" className="text-xs uppercase">{ch}</Badge>
                  <p className="text-2xl font-bold">{pack.credits.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{pack.unit}</p>
                  <p className="text-lg font-semibold text-accent">${pack.price}</p>
                </div>
              );
            })}
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
