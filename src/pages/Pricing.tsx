import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";

const tiers = [
  {
    name: "Free Trial",
    monthlyPrice: 0,
    yearlyPrice: 0,
    note: "14 days, no card required",
    features: [
      "Up to 100 contacts",
      "1 active campaign",
      "Email channel only",
      "Basic analytics",
      "Community support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    monthlyPrice: 49,
    yearlyPrice: 39,
    note: "For growing businesses",
    features: [
      "Unlimited contacts",
      "Unlimited campaigns",
      "Email + WhatsApp + SMS",
      "AI Copywriter",
      "Nurture Flow Builder",
      "Funnel & Page Builder",
      "Advanced analytics",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Agency",
    monthlyPrice: 149,
    yearlyPrice: 119,
    note: "For teams & agencies",
    features: [
      "Everything in Pro",
      "Multi-client workspaces",
      "White-label dashboard",
      "Custom branding",
      "API access",
      "Dedicated account manager",
      "Priority phone support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const comparisonFeatures = [
  { name: "Contacts", free: "100", pro: "Unlimited", agency: "Unlimited" },
  { name: "Campaigns", free: "1", pro: "Unlimited", agency: "Unlimited" },
  { name: "Email", free: "✓", pro: "✓", agency: "✓" },
  { name: "WhatsApp", free: "—", pro: "✓", agency: "✓" },
  { name: "SMS", free: "—", pro: "✓", agency: "✓" },
  { name: "AI Copywriter", free: "—", pro: "✓", agency: "✓" },
  { name: "Nurture Flows", free: "—", pro: "✓", agency: "✓" },
  { name: "Funnel Builder", free: "—", pro: "✓", agency: "✓" },
  { name: "Analytics", free: "Basic", pro: "Advanced", agency: "Advanced+" },
  { name: "White-label", free: "—", pro: "—", agency: "✓" },
  { name: "API Access", free: "—", pro: "—", agency: "✓" },
];

const Pricing = () => {
  const [yearly, setYearly] = useState(false);

  return (
    <Layout>
      <section className="bg-hero py-20 text-center">
        <div className="container">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
            <Zap className="h-3.5 w-3.5" /> Pricing
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-primary-foreground md:text-5xl">
            Simple, Transparent <span className="text-gradient-gold">Pricing</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
            Start free. Scale as you grow. Save ~20% with yearly billing.
          </p>
          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-navy-light bg-navy-light/40 p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!yearly ? "bg-accent text-accent-foreground shadow-gold" : "text-primary-foreground/60"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${yearly ? "bg-accent text-accent-foreground shadow-gold" : "text-primary-foreground/60"}`}
            >
              Yearly <span className="ml-1 text-xs">(-20%)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="-mt-8 pb-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-8 ${
                  tier.highlight
                    ? "border-accent bg-card shadow-gold relative"
                    : "bg-card shadow-card"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">
                    ${yearly ? tier.yearlyPrice : tier.monthlyPrice}
                  </span>
                  {tier.monthlyPrice > 0 && <span className="text-muted-foreground">/mo</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tier.note}</p>
                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={tier.name === "Agency" ? "/contact?subject=sales" : "/register"} className="mt-8 block">
                  <Button
                    className={`w-full ${tier.highlight ? "bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold" : ""}`}
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {tier.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-surface py-20">
        <div className="container">
          <h2 className="mb-8 text-center text-2xl font-bold">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold">Free Trial</th>
                  <th className="px-4 py-3 text-center font-semibold text-accent">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((f) => (
                  <tr key={f.name} className="border-b">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{f.free}</td>
                    <td className="px-4 py-3 text-center font-medium">{f.pro}</td>
                    <td className="px-4 py-3 text-center">{f.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Pricing;
