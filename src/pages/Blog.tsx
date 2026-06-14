import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Clock, ArrowRight, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categoriesList = ["All", "AI Sales Automation", "Lead Generation Systems", "Marketing Automation Tools", "Sales Funnels & Conversion", "WhatsApp & Email Automation"];

const Blog = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [email, setEmail] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_blog_posts" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = posts.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <Layout>
      <Seo
        title="Blog – AI Sales, Marketing Automation & Growth Insights"
        description="Practical guides on AI sales, marketing automation, CRM, funnels and multi-channel growth from the NexusFlo24 team."
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero py-24 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>
        <div className="container relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5" /> Insights &amp; Playbooks
          </span>
          <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-primary-foreground md:text-6xl animate-fade-up animation-delay-200">
            NexusFlo24 <span className="text-gradient-gold">Blog</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70 animate-fade-up animation-delay-400">
            Insights, tips, and strategies for AI-powered marketing automation.
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-primary-foreground/60 animate-fade-up animation-delay-400">
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> Expert guides</span>
            <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Growth tactics</span>
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI-first strategies</span>
          </div>
          <div className="relative mx-auto mt-10 max-w-md animate-fade-up animation-delay-600">
            <div className="rounded-full bg-gradient-to-br from-accent/50 via-border to-accent/20 p-[1px] shadow-gold">
              <div className="relative rounded-full bg-navy-light/60 backdrop-blur">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                <Input
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 rounded-full border-0 bg-transparent pl-11 pr-4 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b bg-background sticky top-16 z-40">
        <div className="container py-3 flex gap-2 overflow-x-auto">
          {categoriesList.map((c) => (
            <Button key={c} variant={activeCategory === c ? "default" : "ghost"} size="sm" onClick={() => setActiveCategory(c)} className={activeCategory === c ? "bg-accent text-accent-foreground hover:bg-gold-dark" : ""}>
              {c}
            </Button>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-20 bg-primary">
        <div className="container max-w-6xl">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-44 w-full" />
                  <CardContent className="pt-4 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <Link to={`/blog/${featured.slug}`} className="block mb-12 group">
                  <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow md:flex">
                    <div className="md:w-1/2 h-56 md:h-auto overflow-hidden">
                      <img src={featured.image_url || ""} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <CardContent className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                      <Badge className="w-fit mb-3 bg-accent/10 text-accent border-accent/30">{featured.category}</Badge>
                      <h2 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-accent transition-colors">{featured.title}</h2>
                      <p className="text-muted-foreground text-sm mb-4">{featured.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {featured.published_at ? new Date(featured.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.read_time}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p) => (
                  <Link key={p.slug} to={`/blog/${p.slug}`} className="group">
                    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow h-full">
                      <div className="h-44 overflow-hidden">
                        <img src={p.image_url || ""} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                      <CardContent className="pt-4 space-y-2">
                        <Badge variant="outline" className="text-xs">{p.category}</Badge>
                        <h3 className="font-semibold leading-tight group-hover:text-accent transition-colors">{p.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.published_at ? new Date(p.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.read_time}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-12">No articles found. Try a different search or category.</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-hero py-16 text-center">
        <div className="container max-w-lg">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">Stay in the Loop</h2>
          <p className="text-primary-foreground/80 mb-6">Get the latest AI marketing insights delivered to your inbox.</p>
          <div className="flex gap-2">
            <Input placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" />
            <Button className="bg-accent text-accent-foreground hover:bg-gold-dark shrink-0">Subscribe</Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
