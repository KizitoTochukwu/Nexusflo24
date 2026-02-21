import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Clock, ArrowRight, User } from "lucide-react";

const categoriesList = ["All", "AI Marketing", "Automation Tips", "SaaS Growth", "Digital Business"];

const posts = [
  { slug: "ai-marketing-trends-2026", title: "Top 10 AI Marketing Trends Shaping 2026", excerpt: "Discover the cutting-edge AI technologies transforming digital marketing this year and how to leverage them for your business.", category: "AI Marketing", date: "Feb 18, 2026", readTime: "6 min", author: "NexusFlo24 Team", featured: true, image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop" },
  { slug: "automate-lead-follow-up", title: "How to Automate Your Lead Follow-Up in 5 Steps", excerpt: "Stop losing leads. Learn how to set up automated follow-up sequences that convert prospects into customers.", category: "Automation Tips", date: "Feb 15, 2026", readTime: "4 min", author: "NexusFlo24 Team", featured: false, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop" },
  { slug: "saas-growth-playbook", title: "The SaaS Growth Playbook for 2026", excerpt: "Proven strategies for scaling your SaaS business using AI-powered marketing automation and data-driven decisions.", category: "SaaS Growth", date: "Feb 12, 2026", readTime: "8 min", author: "NexusFlo24 Team", featured: false, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop" },
  { slug: "whatsapp-marketing-guide", title: "The Ultimate WhatsApp Marketing Guide", excerpt: "WhatsApp has 2B+ users. Learn how to use it as a powerful marketing channel with automation and personalization.", category: "Digital Business", date: "Feb 10, 2026", readTime: "5 min", author: "NexusFlo24 Team", featured: false, image: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=400&h=225&fit=crop" },
  { slug: "crm-automation-mistakes", title: "5 CRM Automation Mistakes That Cost You Leads", excerpt: "Avoid these common pitfalls when setting up your CRM automation and keep your pipeline healthy.", category: "Automation Tips", date: "Feb 8, 2026", readTime: "4 min", author: "NexusFlo24 Team", featured: false, image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&h=225&fit=crop" },
  { slug: "ai-email-personalization", title: "AI-Powered Email Personalization That Actually Works", excerpt: "Generic emails are dead. Here's how AI can craft hyper-personalized emails that get opened and clicked.", category: "AI Marketing", date: "Feb 5, 2026", readTime: "5 min", author: "NexusFlo24 Team", featured: false, image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=225&fit=crop" },
];

const Blog = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [email, setEmail] = useState("");

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
          {/* Featured */}
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="block mb-12 group">
              <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow md:flex">
                <div className="md:w-1/2 h-56 md:h-auto overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <CardContent className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                  <Badge className="w-fit mb-3 bg-accent/10 text-accent border-accent/30">{featured.category}</Badge>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-accent transition-colors">{featured.title}</h2>
                  <p className="text-muted-foreground text-sm mb-4">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {featured.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readTime}</span>
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
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    <h3 className="font-semibold leading-tight group-hover:text-accent transition-colors">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readTime}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No articles found. Try a different search or category.</p>
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
