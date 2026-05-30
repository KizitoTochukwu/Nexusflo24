import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  Search,
  FileText,
  Sparkles,
  Wrench,
  Workflow,
  BarChart3,
  TrendingDown,
  EyeOff,
  Bot,
  Globe,
  Users,
  Briefcase,
  Store,
  ShoppingBag,
  GraduationCap,
  Building2,
  Rocket,
  Loader2,
  Star,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCaptureLead } from "@/hooks/useCaptureLead";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/ai-seo-visibility-hero.jpg";

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const auditSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  business_name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(255),
  website_url: z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => !v || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}.*/i.test(v),
      "Enter a valid website URL"
    )
    .optional()
    .or(z.literal("")),
  service_offered: z.string().trim().max(300).optional().or(z.literal("")),
  main_goal: z.string().trim().min(1, "Please pick a goal"),
});

const problems = [
  {
    icon: TrendingDown,
    title: "Low website traffic",
    desc: "You're publishing, posting, and paying for ads — but your site still feels invisible to the people who matter.",
  },
  {
    icon: EyeOff,
    title: "Poor Google visibility",
    desc: "Your competitors rank for the keywords you should own, while your pages sit buried on page 3 and beyond.",
  },
  {
    icon: Bot,
    title: "Not in AI search answers",
    desc: "When buyers ask ChatGPT, Gemini, Claude, or Perplexity for recommendations — your brand never gets mentioned.",
  },
];

const services = [
  {
    icon: Search,
    title: "AI SEO Content Strategy",
    desc: "We identify high-value topics, customer questions, and search opportunities your target audience is already looking for.",
  },
  {
    icon: FileText,
    title: "SEO Blog Content Creation",
    desc: "We create optimised blog content designed to improve Google visibility, build authority, and attract qualified website visitors.",
  },
  {
    icon: Sparkles,
    title: "GEO Optimisation",
    desc: "We structure your content so AI platforms like ChatGPT, Gemini, Claude, and Perplexity can better understand and recommend your brand.",
  },
  {
    icon: Wrench,
    title: "Technical SEO Audit",
    desc: "We review your website structure, metadata, schema, page speed, indexing, internal links, and content gaps.",
  },
  {
    icon: Workflow,
    title: "Automated Publishing Workflow",
    desc: "We help set up a smoother content publishing process so your visibility engine runs consistently, not randomly.",
  },
  {
    icon: BarChart3,
    title: "Monthly Visibility Reporting",
    desc: "We track keyword movement, organic traffic, indexed pages, lead conversions, and visibility growth.",
  },
];

const audiences = [
  { icon: Users, label: "Coaches & consultants" },
  { icon: Rocket, label: "SaaS startups" },
  { icon: Briefcase, label: "Service-based businesses" },
  { icon: Sparkles, label: "Digital product creators" },
  { icon: Building2, label: "Agencies" },
  { icon: Store, label: "Local businesses" },
  { icon: ShoppingBag, label: "E-commerce brands" },
  { icon: GraduationCap, label: "Online educators" },
];

const steps = [
  {
    title: "Visibility Audit",
    desc: "We analyse your website, search presence, content gaps, and AI discoverability.",
  },
  {
    title: "Keyword & Topic Strategy",
    desc: "We identify the best search opportunities based on your audience, offer, and buying intent.",
  },
  {
    title: "Content Creation & Optimisation",
    desc: "We produce SEO-ready content designed for both human readers and search engines.",
  },
  {
    title: "Publishing & Automation Setup",
    desc: "We help publish and connect your visibility system with your CRM, forms, and lead follow-up workflow.",
  },
  {
    title: "Tracking & Growth Reporting",
    desc: "We monitor traffic, rankings, conversions, and content performance every month.",
  },
];

const benefits = [
  "Attract organic traffic",
  "Reduce dependency on paid ads",
  "Build brand authority",
  "Improve AI search discoverability",
  "Generate more qualified leads",
  "Convert traffic through automation",
  "Create long-term digital assets",
  "Strengthen your online presence",
];

const packages = [
  {
    name: "Starter Visibility Setup",
    tagline: "Best for businesses that need a clear SEO and AI visibility roadmap.",
    items: [
      "Website SEO audit",
      "Content gap analysis",
      "30-day topic plan",
      "Keyword opportunity research",
      "Basic technical recommendations",
    ],
    cta: "Book a Free Audit",
    highlight: false,
  },
  {
    name: "Growth Content Engine",
    tagline: "Best for businesses that want consistent monthly SEO content and visibility growth.",
    items: [
      "Monthly SEO content plan",
      "SEO blog content creation",
      "On-page optimisation",
      "AI search visibility structuring",
      "Monthly performance report",
    ],
    cta: "Request Growth Plan",
    highlight: true,
  },
  {
    name: "Authority Growth Engine",
    tagline: "Best for businesses that want a complete organic lead generation system.",
    items: [
      "Full SEO and GEO strategy",
      "Technical SEO support",
      "Monthly optimised content",
      "Authority-building guidance",
      "CRM and lead tracking setup",
      "Monthly strategy review",
    ],
    cta: "Book a Strategy Call",
    highlight: false,
  },
];

const faqs = [
  {
    q: "What is AI search visibility?",
    a: "AI search visibility means making your brand easier for AI platforms like ChatGPT, Gemini, Claude, and Perplexity to understand, reference, and recommend when users ask questions related to your business.",
  },
  {
    q: "Is this the same as normal SEO?",
    a: "No. Traditional SEO focuses mainly on search engines like Google. AI search visibility also focuses on how your brand appears inside AI-generated answers and recommendation engines.",
  },
  {
    q: "How long does SEO take to work?",
    a: "SEO is a long-term growth strategy. Some improvements can be seen within weeks, but meaningful ranking and traffic growth usually takes consistent effort over several months.",
  },
  {
    q: "Do you guarantee rankings?",
    a: "No serious SEO service should guarantee rankings. We focus on improving your visibility, content quality, technical structure, and organic lead generation potential.",
  },
  {
    q: "Can this connect with my CRM?",
    a: "Yes. NexusFlo24 can help connect your lead forms, website traffic, and enquiry process into CRM and automated follow-up workflows.",
  },
  {
    q: "Is this suitable for small businesses?",
    a: "Yes. This service is ideal for small businesses that want to build long-term organic visibility instead of depending only on paid advertising.",
  },
];

const flowNodes = ["Visibility", "Traffic", "Leads", "Automation", "Sales"];

const trustPills = [
  "AI-powered SEO strategy",
  "Google & AI search visibility",
  "Content automation",
  "Lead conversion tracking",
];

export default function AiSeoVisibilityEngine() {
  const { capture } = useCaptureLead();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    email: "",
    website_url: "",
    service_offered: "",
    main_goal: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = auditSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check your details");
      return;
    }
    setLoading(true);
    try {
      await capture({
        full_name: form.full_name,
        email: form.email,
        source: "AI SEO Visibility Engine",
        tags: ["seo-audit-request", "ai-visibility-lead", `goal-${form.main_goal.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`],
        notes: `AI SEO Visibility Audit request. Business: ${form.business_name || "N/A"}. Website: ${form.website_url || "N/A"}. Service offered: ${form.service_offered || "N/A"}. Main goal: ${form.main_goal}.`,
        formId: "ai-seo-visibility-audit",
        page: "/ai-seo-visibility-engine",
        lead_destination: {
          folder_name: "SEO Audit Requests",
          apply_tags: ["seo-audit-request"],
          source: "AI SEO Visibility Engine",
          pipeline_stage: "new_lead",
        },
      } as any);

      supabase.functions
        .invoke("notify-form-submission", {
          body: {
            form_id: "ai-seo-visibility-audit",
            form_name: "AI SEO Visibility Audit Request",
            workspace_id: "624d5422-a619-47bd-ab77-8ec7b8208023",
            values: {
              "Full Name": form.full_name,
              "Business Name": form.business_name || "—",
              Email: form.email,
              Website: form.website_url || "—",
              "Service Offered": form.service_offered || "—",
              "Main Goal": form.main_goal,
            },
            lead_email: form.email,
            lead_name: form.full_name,
            notify_channels: { email: true, whatsapp: true, sms: false },
            notify_emails: ["admin@nexusflo24.com"],
            notify_phones: ["+447517327597"],
            send_confirmation: true,
          },
        })
        .catch((err) => console.error("notify-form-submission error:", err));

      setSubmitted(true);
      toast.success("Audit request received!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="AI SEO & Search Visibility Engine | NexusFlo24"
        description="NexusFlo24 helps businesses get found on Google, ChatGPT, Gemini, and AI search platforms through AI-powered SEO, content automation, and organic lead generation systems."
        path="/ai-seo-visibility-engine"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "AI SEO & Search Visibility Engine",
          serviceType: "AI SEO and Search Visibility",
          description:
            "AI-powered SEO, GEO optimisation, content automation, and organic lead generation service for businesses that want to be found on Google and AI search platforms.",
          provider: {
            "@type": "Organization",
            name: "NexusFlo24",
            url: "https://nexusflo24.com",
          },
          areaServed: "Worldwide",
        }}
      />
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                AI SEO & Search Visibility
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary md:text-5xl lg:text-6xl">
                Get Found on Google, ChatGPT & AI Search Platforms
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                NexusFlo24 helps businesses build an AI-powered SEO and content visibility system that attracts organic traffic, improves search authority, and turns website visitors into qualified leads.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => scrollTo("audit-form")}
                  className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold sm:w-auto"
                >
                  Book a Free Visibility Audit
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("how-it-works")}
                  className="w-full border-primary text-primary sm:w-auto"
                >
                  See How It Works
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                {trustPills.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/20 to-primary/10 blur-2xl" />
              <img
                src={heroImage}
                alt="AI SEO and search visibility illustration with Google, ChatGPT, ranking charts, and CRM automation"
                width={1536}
                height={1024}
                className="relative w-full rounded-2xl border border-border/60 shadow-2xl"
              />
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Your Customers Are Searching — But Can They Find You?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Many businesses rely too much on paid ads, referrals, or random social media posting. Meanwhile, potential buyers are searching on Google and asking AI tools for recommendations. If your business isn't visible in those places, you're losing leads before the conversation even starts.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {problems.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                The NexusFlo24 way
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                Introducing the NexusFlo24 AI SEO & Search Visibility Engine
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                A single service that combines SEO strategy, AI-assisted content creation, technical optimisation, GEO optimisation, and automation tracking — so you can attract more organic traffic and convert that traffic into leads.
              </p>
            </div>

            <div className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-center gap-3 md:flex-nowrap">
              {flowNodes.map((node, i) => (
                <div key={node} className="flex items-center gap-3">
                  <div className="rounded-2xl border border-accent/30 bg-card px-5 py-3 text-center shadow-sm">
                    <span className="text-sm font-semibold text-primary md:text-base">{node}</span>
                  </div>
                  {i < flowNodes.length - 1 && (
                    <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">What We Build for You</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything required to turn your website into a long-term organic lead engine.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Built for Businesses That Want Organic Leads Without Guesswork
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.label}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-primary">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                Our process
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                How the AI Visibility System Works
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-5">
              {steps.map((s, i) => (
                <div key={s.title} className="relative">
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <h3 className="text-base font-semibold text-primary">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-accent md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Why This Matters for Your Business
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b) => (
                <div
                  key={b}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm font-medium text-primary">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PACKAGES */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Choose Your Visibility Growth Package
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Transparent options for every stage. Speak with our team and we'll tailor the right scope to your goals.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`relative flex h-full flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                    pkg.highlight
                      ? "border-accent shadow-gold ring-1 ring-accent/30"
                      : "border-border"
                  }`}
                >
                  {pkg.highlight && (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-gold">
                      <Star className="h-3 w-3 fill-current" /> Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-primary">{pkg.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{pkg.tagline}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {pkg.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    onClick={() => scrollTo("audit-form")}
                    className={`mt-8 w-full ${
                      pkg.highlight
                        ? "bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {pkg.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LEAD MAGNET FORM */}
        <section id="audit-form" className="scroll-mt-24 border-y border-border/60 bg-surface py-20">
          <div className="container max-w-3xl">
            <div className="text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                Free audit
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                Get Your Free AI Visibility Audit
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Want to know if your business is visible on Google and AI search platforms? Request a free visibility audit and we'll show you where your website stands, what's missing, and what needs to be fixed to attract more organic leads.
              </p>
            </div>

            <div className="mt-10 rounded-3xl border border-border bg-card p-8 shadow-xl md:p-10">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary">Thank you.</h3>
                  <p className="mt-3 max-w-md text-muted-foreground">
                    Your visibility audit request has been received. The NexusFlo24 team will review your website and contact you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        maxLength={100}
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="business_name">Business name</Label>
                      <Input
                        id="business_name"
                        value={form.business_name}
                        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                        maxLength={120}
                        placeholder="Acme Ltd"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        maxLength={255}
                        placeholder="jane@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input
                        id="website_url"
                        value={form.website_url}
                        onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                        maxLength={255}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="service_offered">What service do you offer?</Label>
                    <Input
                      id="service_offered"
                      value={form.service_offered}
                      onChange={(e) => setForm({ ...form, service_offered: e.target.value })}
                      maxLength={300}
                      placeholder="e.g. Business coaching for founders"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="main_goal">Main goal *</Label>
                    <Select
                      value={form.main_goal}
                      onValueChange={(v) => setForm({ ...form, main_goal: v })}
                    >
                      <SelectTrigger id="main_goal">
                        <SelectValue placeholder="Pick your primary goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="More traffic">More traffic</SelectItem>
                        <SelectItem value="More leads">More leads</SelectItem>
                        <SelectItem value="Better SEO">Better SEO</SelectItem>
                        <SelectItem value="AI visibility">AI visibility</SelectItem>
                        <SelectItem value="Not sure">Not sure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        Request My Free Visibility Audit
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <Accordion type="single" collapsible className="mt-10 w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold text-primary">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-primary py-20 text-primary-foreground">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
                Ready to Build Your Organic Lead Generation Engine?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg">
                Let NexusFlo24 help your business become easier to find, easier to trust, and easier to buy from across Google and AI search platforms.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => scrollTo("audit-form")}
                  className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold sm:w-auto"
                >
                  Book a Free Visibility Audit
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Link to="/contact" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
                  >
                    Speak to NexusFlo24
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
