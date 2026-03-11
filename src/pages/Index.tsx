import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain, Users, Mail, MessageSquare, Workflow, LayoutTemplate,
  PenTool, BarChart3, ArrowRight, Star, CheckCircle, Zap, Target, TrendingUp, Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroDashboard from "@/assets/hero-dashboard.png";
import { useState } from "react";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";

const features = [
  { icon: Brain, title: "AI Lead Gen Engine", desc: "Capture and score leads automatically with AI-powered forms and landing pages." },
  { icon: Users, title: "Smart CRM", desc: "Manage contacts, track interactions, and close deals with intelligent insights." },
  { icon: Mail, title: "AI Email & WhatsApp", desc: "Send personalized campaigns across email and WhatsApp with AI-written copy." },
  { icon: MessageSquare, title: "Bulk SMS", desc: "Reach thousands instantly with targeted SMS campaigns and auto-replies." },
  { icon: Workflow, title: "Nurture Flow Builder", desc: "Drag-and-drop automation workflows that convert leads on autopilot." },
  { icon: LayoutTemplate, title: "Funnel & Page Builder", desc: "Build high-converting funnels and landing pages in minutes — no code needed." },
  { icon: PenTool, title: "AI Copywriter", desc: "Generate compelling subject lines, ad copy, and follow-ups with AI." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "See what's converting with real-time analytics and AI-powered insights." },
];

const steps = [
  { icon: Target, title: "Capture", desc: "AI-powered forms, landing pages, and chatbots capture leads 24/7.", num: "01" },
  { icon: Workflow, title: "Nurture", desc: "Automated email, WhatsApp, and SMS flows keep leads engaged.", num: "02" },
  { icon: TrendingUp, title: "Convert", desc: "AI scores leads and notifies your team when they're ready to buy.", num: "03" },
];

const testimonials = [
  { name: "Sarah Chen", role: "Founder, GrowthLab", text: "NexusFlo24 replaced 5 tools for us. Our conversion rate jumped 3x in 60 days.", metric: "3x conversions", avatar: "SC" },
  { name: "Marcus Johnson", role: "Marketing Director, ScaleUp", text: "The AI copywriter alone saves our team 20 hours a week. The automation flows are incredible.", metric: "20hrs saved/week", avatar: "MJ" },
  { name: "Priya Patel", role: "Agency Owner, DigitalPulse", text: "White-label dashboard is a game-changer. Our clients love the branded experience.", metric: "40+ clients", avatar: "PP" },
  { name: "David Kim", role: "E-commerce, ShopNest", text: "WhatsApp automations drove a 45% increase in repeat purchases. Absolutely essential.", metric: "+45% repeat sales", avatar: "DK" },
];

const faqs = [
  { q: "What is NexusFlo24?", a: "NexusFlo24 is an all-in-one AI-powered marketing automation platform that helps you capture leads, nurture them with personalized multi-channel campaigns, and convert them into customers — all from a single dashboard." },
  { q: "Do I need technical skills to use it?", a: "Not at all. NexusFlo24 is designed for non-technical users. Our drag-and-drop builders, AI copywriter, and pre-built templates make it easy to get started in minutes." },
  { q: "What channels does NexusFlo24 support?", a: "Email, WhatsApp, SMS, web chat, and landing pages. All channels are connected so you can create unified nurture flows across every touchpoint." },
  { q: "Is there a free trial?", a: "Yes! You can start with a 14-day free trial with access to all Pro features. No credit card required." },
  { q: "Can I use NexusFlo24 for my agency?", a: "Absolutely. Our Agency plan includes white-label dashboards, multi-client management, and priority support — perfect for agencies of any size." },
  { q: "What integrations are available?", a: "We integrate with Google Sheets, Zapier, Make.com, Meta Ads, Stripe, PayPal, and many more. Custom webhook support is also available." },
  { q: "Is my data secure?", a: "Yes. NexusFlo24 is GDPR-ready with enterprise-grade encryption, role-based access controls, and 99.9% uptime SLA." },
  { q: "How does AI personalization work?", a: "Our AI analyzes lead behavior, engagement patterns, and demographics to automatically personalize messaging, timing, and channel selection for maximum conversion." },
];

const integrations = ["Google Sheets", "Zapier", "Make.com", "Meta Ads", "Stripe", "PayPal"];

const Index = () => {
  const [heroEmail, setHeroEmail] = useState("");
  const heroCap = useCaptureLead();

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroEmail || !/\S+@\S+\.\S+/.test(heroEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      await heroCap.capture({
        email: heroEmail,
        source: "Landing Page",
        tags: ["website-signup", "hero-cta"],
        notes: "Signed up via homepage hero CTA form.",
        formId: "hero-cta",
        page: "/",
      });
      toast.success("You're in — check your inbox!");
      setHeroEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
  <Layout>
    {/* Hero */}
    <section className="bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(213_50%_25%_/_0.5),transparent_70%)]" />
      <div className="container relative z-10 py-20 md:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Marketing Automation
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Automate Your Marketing.{" "}
              <span className="text-gradient-gold">Convert Smarter.</span>{" "}
              Grow Faster — with AI.
            </h1>
            <p className="max-w-lg text-lg text-primary-foreground/70">
              NexusFlo24 helps you capture leads, nurture them automatically, and close more sales — all in one AI-powered platform.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-8">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact?subject=demo" className="inline-block">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-white hover:bg-primary hover:text-primary-foreground text-base px-8">
                Book a Demo
              </Button>
            </Link>
          </div>
          <div className="animate-fade-up animation-delay-200">
            <img
              src={heroDashboard}
              alt="NexusFlo24 AI marketing automation dashboard showing CRM, workflows, and analytics"
              className="rounded-xl shadow-2xl border border-navy-light/30"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Social proof */}
    <section className="border-b bg-surface py-8">
      <div className="container">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Integrates with your favorite tools
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {integrations.map((name) => (
            <span key={name} className="text-sm font-semibold text-muted-foreground/60 transition-colors hover:text-muted-foreground">
              {name}
            </span>
          ))}
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">GDPR Ready</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">99.9% Uptime</span>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 md:py-28" id="features">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Features</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Everything You Need to Grow</h2>
          <p className="mt-4 text-muted-foreground">
            One platform for lead generation, nurturing, and conversion. Powered by AI.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="bg-surface py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">How It Works</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Three Steps to Smarter Growth</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-xl border bg-card p-8 text-center shadow-card">
              <span className="mb-4 block text-5xl font-extrabold text-accent/20">{s.num}</span>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                <s.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Demo */}
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">See It In Action</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Your Marketing Command Center</h2>
            <ul className="mt-6 space-y-3">
              {[
                "Launch a nurture flow in minutes",
                "AI writes your follow-ups",
                "See what's converting in real-time",
                "Multi-channel: Email + WhatsApp + SMS",
                "Score and route leads automatically",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/dashboard" className="mt-8 inline-block">
              <Button className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
                Explore Demo Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-xl border bg-surface p-4 shadow-card">
            <img
              src={heroDashboard}
              alt="NexusFlo24 dashboard demo preview"
              className="rounded-lg"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="bg-hero py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-gold">Testimonials</span>
          <h2 className="mt-2 text-3xl font-bold text-primary-foreground md:text-4xl">
            Loved by Marketers Everywhere
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-navy-light bg-navy-light/30 p-6 backdrop-blur">
              <div className="mb-3 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="mb-4 text-sm text-primary-foreground/80">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">{t.name}</p>
                  <p className="text-xs text-primary-foreground/60">{t.role}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-accent/10 px-3 py-1 text-center text-xs font-semibold text-gold">
                {t.metric}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>


    {/* FAQ */}
    <section className="bg-surface py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">FAQ</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border bg-card px-6 shadow-card">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>

    {/* Final CTA */}
    <section className="bg-hero py-20 text-center">
      <div className="container">
        <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
          Ready to Grow Smarter?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Join thousands of marketers automating their growth with NexusFlo24.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-8">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/contact?subject=demo">
            <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-white hover:bg-primary hover:text-primary-foreground text-base px-8">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </Layout>
  );
};

export default Index;
