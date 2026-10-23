import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Minus, ArrowRight, Scale } from "lucide-react";
import { PLANS, TRIAL_DAYS } from "@/lib/stripe/plans";

type Cell = string | boolean;
const rows: { label: string; nexus: Cell; ghl: Cell; hubspot: Cell }[] = [
  { label: "Best suited to", nexus: "Small businesses, creators & local service firms", ghl: "Marketing agencies reselling to clients", hubspot: "Growing and mid-size sales & marketing teams" },
  { label: "Starting paid plan", nexus: `$${PLANS.starter.monthlyPrice}/month`, ghl: "Higher entry price – see their pricing page", hubspot: "Free CRM; paid hubs priced per seat/tier" },
  { label: "Free trial", nexus: `${TRIAL_DAYS} days on Starter`, ghl: "Yes", hubspot: "Free tools + paid trials" },
  { label: "WhatsApp built into automations", nexus: true, ghl: "Available, setup varies", hubspot: "Via integration / add-on" },
  { label: "Email, SMS & WhatsApp in one flow", nexus: true, ghl: true, hubspot: "Email native; others via add-ons" },
  { label: "CRM, deals & pipelines", nexus: true, ghl: true, hubspot: true },
  { label: "Funnels & landing pages", nexus: true, ghl: true, hubspot: true },
  { label: "Booking pages", nexus: true, ghl: true, hubspot: true },
  { label: "AI copy & workflow generator", nexus: true, ghl: true, hubspot: true },
  { label: "White-label for agencies", nexus: "Enterprise plan", ghl: true, hubspot: false },
  { label: "Setup effort for a non-technical owner", nexus: "Low – templates & guided setup", ghl: "Medium–high", hubspot: "Medium" },
];

const render = (v: Cell) =>
  v === true ? <Check className="mx-auto h-5 w-5 text-accent" aria-label="Yes" /> :
  v === false ? <Minus className="mx-auto h-5 w-5 text-muted-foreground" aria-label="No" /> :
  <span className="text-sm">{v}</span>;

const CompareGoHighLevelHubSpot = () => (
  <Layout>
    <Seo
      title="NexusFlo24 vs GoHighLevel vs HubSpot – Honest Comparison"
      description="Compare NexusFlo24, GoHighLevel and HubSpot for WhatsApp, email and SMS automation, CRM, funnels and pricing. Find the right fit for your small business."
    />
    <section className="bg-hero py-20 text-center">
      <div className="container max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
          <Scale className="h-3.5 w-3.5" /> Comparison
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl">
          NexusFlo24 vs GoHighLevel vs <span className="text-gradient-gold">HubSpot</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70">
          All three can run your CRM and marketing. Here's an honest look at who each one suits — especially if WhatsApp is how your customers talk to you.
        </p>
      </div>
    </section>

    <section className="bg-background py-16">
      <div className="container max-w-5xl">
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface">
              <tr>
                <th className="p-4 text-sm font-semibold">Feature</th>
                <th className="p-4 text-center text-sm font-semibold text-accent">NexusFlo24</th>
                <th className="p-4 text-center text-sm font-semibold">GoHighLevel</th>
                <th className="p-4 text-center text-sm font-semibold">HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="p-4 text-sm font-medium">{r.label}</td>
                  <td className="bg-accent/5 p-4 text-center">{render(r.nexus)}</td>
                  <td className="p-4 text-center">{render(r.ghl)}</td>
                  <td className="p-4 text-center">{render(r.hubspot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Based on publicly available information as of October 2026. Competitor features and prices change — check their websites for current details.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { t: "Choose NexusFlo24 if…", b: "You're a small business or creator who wants email, WhatsApp and SMS follow-up, a CRM and funnels in one place — at a low starting price and without technical setup." },
            { t: "Choose GoHighLevel if…", b: "You run an agency managing many client accounts and need deep white-label and sub-account tools, and you're comfortable with a steeper setup." },
            { t: "Choose HubSpot if…", b: "You have a larger sales and marketing team, need advanced reporting across many seats, and email is your main channel." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="text-lg font-bold">{c.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-hero py-16 text-center">
      <div className="container max-w-2xl">
        <h2 className="text-3xl font-bold text-primary-foreground">Try NexusFlo24 free for {TRIAL_DAYS} days</h2>
        <p className="mt-3 text-primary-foreground/70">See how it fits your business before you decide.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
            <Link to="/register">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-gold/40 bg-transparent text-primary-foreground hover:bg-gold/10">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export default CompareGoHighLevelHubSpot;
