import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ConfiguratorDialog from "@/components/store/ConfiguratorDialog";
import ProductCard from "@/components/store/ProductCard";
import {
  DELIVERY_BUCKETS, LEVELS, LEVEL_ORDER, PRICE_BANDS, SORT_OPTIONS,
} from "@/lib/store/constants";
import {
  useStoreCategories, useStoreProblems, useStoreProducts, type StoreProduct,
} from "@/hooks/useStore";

export default function StoreCatalogue() {
  const [params, setParams] = useSearchParams();
  const { data: products = [], isLoading } = useStoreProducts();
  const { data: categories = [] } = useStoreCategories();
  const { data: problems = [] } = useStoreProblems();
  const [configuring, setConfiguring] = useState<StoreProduct | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const get = (key: string) => params.get(key) ?? "all";
  const search = params.get("q") ?? "";
  const sort = params.get("sort") ?? "recommended";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const activeCount = ["category", "problem", "level", "price", "delivery", "q"].filter(
    (key) => params.get(key),
  ).length;

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = products.filter((product) => {
      if (get("category") !== "all" && product.category_slug !== get("category")) return false;
      if (get("problem") !== "all" && !(product.problem_slugs ?? []).includes(get("problem")))
        return false;
      if (get("level") !== "all" && product.level !== get("level")) return false;
      if (get("price") !== "all") {
        const band = PRICE_BANDS.find((b) => b.value === get("price"));
        if (band && (product.base_price_pence < band.min || product.base_price_pence > band.max))
          return false;
      }
      if (get("delivery") !== "all") {
        const bucket = DELIVERY_BUCKETS.find((b) => b.value === get("delivery"));
        const days = product.delivery_days ?? 999;
        if (bucket) {
          const min = bucket.value === "fast" ? 0 : bucket.value === "standard" ? 6 : 11;
          if (days < min || days > bucket.max) return false;
        }
      }
      if (term) {
        const haystack = [
          product.name, product.outcome, product.summary ?? "",
          ...(product.tags ?? []), ...(product.integrations ?? []), ...(product.industries ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    list = [...list];
    if (sort === "popular") list.sort((a, b) => Number(b.is_popular) - Number(a.is_popular));
    else if (sort === "price-asc") list.sort((a, b) => a.base_price_pence - b.base_price_pence);
    else if (sort === "price-desc") list.sort((a, b) => b.base_price_pence - a.base_price_pence);
    else if (sort === "newest")
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return list;
  }, [products, params, search, sort]);

  const filters = (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category
        </Label>
        <Select value={get("category")} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Business problem
        </Label>
        <Select value={get("problem")} onValueChange={(v) => setParam("problem", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Any problem</SelectItem>
            {problems.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Automation level
        </Label>
        <Select value={get("level")} onValueChange={(v) => setParam("level", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All levels</SelectItem>
            {LEVEL_ORDER.map((level) => (
              <SelectItem key={level} value={level}>{LEVELS[level].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Price
        </Label>
        <Select value={get("price")} onValueChange={(v) => setParam("price", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Any price</SelectItem>
            {PRICE_BANDS.map((band) => (
              <SelectItem key={band.value} value={band.value}>{band.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Delivery time
        </Label>
        <Select value={get("delivery")} onValueChange={(v) => setParam("delivery", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Any timeframe</SelectItem>
            {DELIVERY_BUCKETS.map((bucket) => (
              <SelectItem key={bucket.value} value={bucket.value}>{bucket.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <Seo
        title="All Automations | NexusFlo24 Automation Store"
        description="Browse every done-for-you automation: lead capture, follow-up, sales, bookings, customer service, reporting and more. Fixed pricing and clear delivery times."
        path="/automations/all"
      />

      <section className="border-b bg-surface py-12">
        <div className="container">
          <h1 className="text-3xl font-bold md:text-4xl">Automation Catalogue</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every automation is fully built, tested and launched by our team. Filter by the outcome
            you need, not the technology behind it.
          </p>
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search automations, tools or outcomes..."
              className="pl-9"
            />
          </div>
        </div>
      </section>

      <section className="bg-background py-10">
        <div className="container grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border bg-card p-5">{filters}</div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading automations..." : `${results.length} automations`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowFilters((s) => !s)}
                >
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                  Filters{activeCount ? ` (${activeCount})` : ""}
                </Button>
                <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
                  <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showFilters && (
              <div className="mb-6 rounded-xl border bg-card p-5 lg:hidden">{filters}</div>
            )}

            {results.length === 0 && !isLoading ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <h2 className="text-lg font-semibold">No automations match those filters</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear a filter, or let us design something bespoke for your business.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                    Clear filters
                  </Button>
                  <Button className="bg-accent text-accent-foreground hover:bg-gold-dark" asChild>
                    <a href="/build-my-automation">Build my automation</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} onConfigure={setConfiguring} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfiguratorDialog
        product={configuring}
        open={!!configuring}
        onOpenChange={(open) => !open && setConfiguring(null)}
      />
    </Layout>
  );
}
