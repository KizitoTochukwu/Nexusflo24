import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import ConfiguratorDialog from "@/components/store/ConfiguratorDialog";
import HeroWorkflowVisual from "@/components/store/HeroWorkflowVisual";
import ProductCard from "@/components/store/ProductCard";
import { SectionHeading, StoreCta, StoreIcon, TrustStrip } from "@/components/store/StorePrimitives";
import { DELIVERY_STEPS, LEVELS, LEVEL_ORDER } from "@/lib/store/constants";
import { useStorePrice } from "@/lib/store/price";
import {
  useStoreBundles, useStoreCategories, useStorePlans, useStoreProblems, useStoreProducts,
  type StoreProduct,
} from "@/hooks/useStore";

export default function StoreIndex() {
  const { data: categories = [] } = useStoreCategories();
  const { data: problems = [] } = useStoreProblems();
  const { data: products = [] } = useStoreProducts();
  const { data: bundles = [] } = useStoreBundles();
  const { data: plans = [] } = useStorePlans();
  const { format } = useStorePrice();
  const [configuring, setConfiguring] = useState<StoreProduct | null>(null);

  const popular = products.filter((p) => p.is_popular).slice(0, 6);
  const featured = popular.length ? popular : products.slice(0, 6);

  return (
    <Layout>
      <Seo
        title="Automation Store | Buy Done-For-You Business Automations"
        description="Browse ready-made AI and business automations. Choose your outcome, configure it in minutes, and NexusFlo24 builds, tests and launches it for you."
        path="/automations"
      />

      {/* Hero */}
      <section className="bg-hero py-20 md:py-28">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Automation Store
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Buy Ready-Made Automations for Your Business
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/70">
              Choose the outcome you want. We build, test and launch the automation for you — no
              technical skills, no agencies, no long projects.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/automations/all">
                <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-gold-dark sm:w-auto">
                  Browse Automations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/automation-finder">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                >
                  Find My Automation
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/50">
              Fixed pricing · Built and tested for you · Human support throughout
            </p>
          </div>
          <HeroWorkflowVisual />
        </div>
      </section>

      <TrustStrip />

      {/* Problem finder */}
      <section className="py-16 md:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Start with the problem"
            title="What is slowing your business down?"
            subtitle="Pick the problem you recognise and we will show you the automations that solve it."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <Link
                key={problem.id}
                to={`/automations/all?problem=${problem.slug}`}
                className="group rounded-xl border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <StoreIcon name={problem.icon} className="h-5 w-5 text-accent" />
                </span>
                <h3 className="font-semibold group-hover:text-accent">{problem.title}</h3>
                {problem.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{problem.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Categories"
            title="Automation categories"
            subtitle="Every category is a real business function, not a technical feature."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/automations/category/${category.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <StoreIcon name={category.icon} className="h-5 w-5 text-primary" />
                </span>
                <h3 className="font-semibold group-hover:text-accent">{category.name}</h3>
                {category.tagline && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{category.tagline}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-16 md:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Most popular"
            title="Automations businesses buy first"
            subtitle="Fixed price. Fixed scope. Delivered, tested and launched by our team."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} onConfigure={setConfiguring} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/automations/all">
              <Button size="lg" variant="outline">
                View all automations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Choose your level"
            title="From a single quick win to a connected system"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {LEVEL_ORDER.map((level) => (
              <div key={level} className="rounded-xl border bg-card p-6 shadow-card">
                <h3 className="text-lg font-semibold">{LEVELS[level].label}</h3>
                <p className="mt-1 text-2xl font-bold text-accent">{LEVELS[level].range}</p>
                <p className="mt-3 text-sm text-muted-foreground">{LEVELS[level].blurb}</p>
                <Link
                  to={`/automations/all?level=${level}`}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent"
                >
                  Browse this level <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How delivery works */}
      <section className="py-16 md:py-20">
        <div className="container">
          <SectionHeading eyebrow="How it works" title="A clear path from purchase to go-live" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DELIVERY_STEPS.map((step, i) => (
              <div key={step.title} className="rounded-xl border bg-card p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Step {i + 1}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bundles */}
      {bundles.length > 0 && (
        <section className="bg-surface py-16 md:py-20">
          <div className="container">
            <SectionHeading
              eyebrow="Bundles"
              title="Complete systems, better value"
              subtitle="Grouped automations that solve a whole business function together."
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {bundles.map((bundle) => (
                <div key={bundle.id} className="flex flex-col rounded-xl border bg-card p-6 shadow-card">
                  <h3 className="font-semibold">{bundle.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{bundle.description}</p>
                  <p className="mt-4 text-xl font-bold">{format(bundle.price_pence)}</p>
                  {bundle.saving_pence > 0 && (
                    <p className="text-xs font-medium text-accent">
                      Save {format(bundle.saving_pence)}
                    </p>
                  )}
                  {bundle.delivery_estimate && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {bundle.delivery_estimate}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/automation-bundles">
                <Button variant="outline">Compare bundles</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Managed plans */}
      {plans.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container">
            <SectionHeading
              eyebrow="Ongoing care"
              title="Managed automation plans"
              subtitle="Optional monthly support to monitor, maintain and improve your automations."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border bg-card p-6 shadow-card">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-bold">
                    {plan.price_prefix ? `${plan.price_prefix} ` : ""}
                    {format(plan.price_pence)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
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
        title="Not sure which automation you need?"
        body="Answer a few short questions and we will recommend the right automation for your business — or design a custom one."
        primary={{ label: "Find My Automation", to: "/automation-finder" }}
        secondary={{ label: "Build My Automation", to: "/build-my-automation" }}
      />

      <ConfiguratorDialog
        product={configuring}
        open={!!configuring}
        onOpenChange={(open) => !open && setConfiguring(null)}
      />
    </Layout>
  );
}
