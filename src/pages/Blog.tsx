import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Clock, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categoriesList = ["All", "AI Sales Automation", "Lead Generation Systems", "Marketing Automation Tools", "Sales Funnels & Conversion", "WhatsApp & Email Automation"];

const Blog = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [email, setEmail] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
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
      {/* Hero */}
      <section className="bg-hero py-16 md:py-20 text-center">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 animate-fade-up">
            NexusFlo24 <span className="text-gradient-gold">Blog</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-8 animate-fade-up animation-delay-200">
            Insights, tips, and strategies for AI-powered marketing automation.
          </p>
          <div className="relative max-w-md mx-auto animate-fade-up animation-delay-400">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" />
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

      <section className="py-12 md:py-20">
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
