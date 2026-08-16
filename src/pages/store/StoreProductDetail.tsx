import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Clock, ShieldCheck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfiguratorDialog from "@/components/store/ConfiguratorDialog";
import ProductCard from "@/components/store/ProductCard";
import {
  LevelBadge, SectionHeading, StoreCta, WorkflowChain,
} from "@/components/store/StorePrimitives";
import { DELIVERY_STEPS, LEVELS } from "@/lib/store/constants";
import { useStorePrice } from "@/lib/store/price";
import { useStoreProduct, useStoreProducts, type StoreProduct } from "@/hooks/useStore";

export default function StoreProductDetail() {
  const { slug } = useParams();
  const { data: product, isLoading } = useStoreProduct(slug);
  const { data: products = [] } = useStoreProducts();
  const { format } = useStorePrice();
  const [configuring, setConfiguring] = useState<StoreProduct | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-background"><div className="container py-24 text-center text-muted-foreground">Loading automation...</div></div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="bg-background"><div className="container py-24 text-center">
          <h1 className="text-2xl font-bold">Automation not found</h1>
          <p className="mt-3 text-muted-foreground">
            This automation may have been renamed or retired.
          </p>
          <Link to="/automations/all" className="mt-6 inline-block">
            <Button>Browse all automations</Button>
          </Link>
        </div></div>
      </Layout>
    );
  }

  const related = products
    .filter((p) => p.slug !== product.slug && p.category_slug === product.category_slug)
    .slice(0, 3);

  return (
    <Layout>
      <Seo
        title={`${product.name} | Automation Store`}
        description={product.summary ?? product.outcome}
        path={`/automations/${product.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.summary ?? product.outcome,
          brand: { "@type": "Brand", name: "NexusFlo24" },
          offers: {
            "@type": "Offer",
            price: (product.base_price_pence / 100).toFixed(2),
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      <section className="bg-hero py-16">
        <div className="container grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <nav className="mb-5 text-sm text-white/50">
              <Link to="/automations" className="hover:text-gold">Automation Store</Link>
              <span className="mx-2">/</span>
              <Link
                to={`/automations/category/${product.category_slug}`}
                className="capitalize hover:text-gold"
              >
                {product.category_slug.replace(/-/g, " ")}
              </Link>
            </nav>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold">
                {LEVELS[product.level]?.badge}
              </Badge>
              {product.badge && (
                <Badge className="bg-white/10 text-white hover:bg-white/10">{product.badge}</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">{product.name}</h1>
            <p className="mt-5 max-w-2xl text-lg text-white/70">{product.outcome}</p>
            {product.problem_statement && (
              <p className="mt-4 max-w-2xl text-white/60">{product.problem_statement}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
            <span className="text-sm text-white/60">One-time setup from</span>
            <p className="mt-1 text-4xl font-bold text-white">{format(product.base_price_pence)}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/60">
              <Clock className="h-4 w-4" />
              {product.delivery_estimate ?? "Timeline confirmed at onboarding"}
            </p>
            <Button
              size="lg"
              className="mt-6 w-full bg-accent text-accent-foreground hover:bg-gold-dark"
              onClick={() => setConfiguring(product)}
            >
              Configure this automation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link to="/build-my-automation">
              <Button
                variant="outline"
                className="mt-3 w-full border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Ask for a custom version
              </Button>
            </Link>
            <p className="mt-5 flex items-start gap-2 text-xs text-white/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              Fixed price confirmed in writing before payment. We build, test and launch it for you.
            </p>
          </div>
        </div>
      </section>

      {product.workflow?.length > 0 && (
        <section className="bg-background py-14">
          <div className="container">
            <SectionHeading eyebrow="How it works" title="Your automation, step by step" align="left" />
            <WorkflowChain steps={product.workflow} />
          </div>
        </section>
      )}

      <section className="bg-surface py-14">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">What you get</h2>
            <ul className="mt-5 space-y-3">
              {product.deliverables?.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Best for</h2>
            <ul className="mt-5 space-y-3">
              {product.best_for?.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {product.integrations?.length > 0 && (
              <>
                <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Works with
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.integrations.map((tool) => (
                    <span key={tool} className="rounded-full border bg-card px-3 py-1 text-xs font-medium">
                      {tool}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="container">
          <SectionHeading eyebrow="Delivery" title="What happens after you buy" />
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

      <ProductReviews productSlug={product.slug} />

      {related.length > 0 && (
        <section className="bg-surface py-14">
          <div className="container">
            <SectionHeading eyebrow="Related" title="Automations that pair well with this" />
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} onConfigure={setConfiguring} />
              ))}
            </div>
          </div>
        </section>
      )}

      <StoreCta
        title={`Ready to launch ${product.name}?`}
        body="Configure it in a few minutes and our team takes it from there — build, test, approve, go live."
        primary={{ label: "Browse all automations", to: "/automations/all" }}
        secondary={{ label: "Talk to our team", to: "/contact" }}
      />

      <ConfiguratorDialog
        product={configuring}
        open={!!configuring}
        onOpenChange={(open) => !open && setConfiguring(null)}
      />
    </Layout>
  );
}
