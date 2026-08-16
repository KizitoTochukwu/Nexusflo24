import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import ConfiguratorDialog from "@/components/store/ConfiguratorDialog";
import ProductCard from "@/components/store/ProductCard";
import { StoreCta, StoreIcon } from "@/components/store/StorePrimitives";
import { useStoreCategories, useStoreProducts, type StoreProduct } from "@/hooks/useStore";

export default function StoreCategory() {
  const { category: slug } = useParams();
  const { data: categories = [] } = useStoreCategories();
  const { data: products = [], isLoading } = useStoreProducts();
  const [configuring, setConfiguring] = useState<StoreProduct | null>(null);

  const category = categories.find((c) => c.slug === slug);
  const items = products.filter((p) => p.category_slug === slug);

  return (
    <Layout>
      <Seo
        title={`${category?.name ?? "Automations"} | NexusFlo24 Automation Store`}
        description={
          category?.description ??
          category?.tagline ??
          "Done-for-you automations built, tested and launched by NexusFlo24."
        }
        path={`/automations/category/${slug}`}
      />

      <section className="border-b bg-surface py-14">
        <div className="container">
          <nav className="mb-4 text-sm text-muted-foreground">
            <Link to="/automations" className="hover:text-accent">Automation Store</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{category?.name ?? slug}</span>
          </nav>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <StoreIcon name={category?.icon} className="h-6 w-6 text-accent" />
            </span>
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{category?.name ?? "Automations"}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {category?.description ?? category?.tagline}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          {isLoading ? (
            <p className="text-muted-foreground">Loading automations...</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h2 className="text-lg font-semibold">Nothing published here yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tell us what you need and we will design it for your business.
              </p>
              <Link to="/build-my-automation" className="mt-5 inline-block">
                <Button className="bg-accent text-accent-foreground hover:bg-gold-dark">
                  Build my automation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} onConfigure={setConfiguring} />
              ))}
            </div>
          )}
        </div>
      </section>

      <StoreCta
        title="Need help choosing?"
        body="Answer a few short questions and we will recommend the right automation for your business."
        primary={{ label: "Find My Automation", to: "/automation-finder" }}
        secondary={{ label: "View all automations", to: "/automations/all" }}
      />

      <ConfiguratorDialog
        product={configuring}
        open={!!configuring}
        onOpenChange={(open) => !open && setConfiguring(null)}
      />
    </Layout>
  );
}
