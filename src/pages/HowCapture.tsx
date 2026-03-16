import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Target, ArrowRight, Zap, FileText, BarChart3, Bot,
  Globe, Smartphone, CheckCircle, Workflow, TrendingUp
} from "lucide-react";

const benefits = [
  { icon: FileText, title: "AI-Powered Forms", desc: "Smart forms that adapt fields based on visitor behavior and pre-fill known data to maximize completion rates." },
  { icon: Globe, title: "High-Converting Landing Pages", desc: "Drag-and-drop builder with proven templates optimized for every industry and campaign type." },
  { icon: Bot, title: "24/7 Chatbot Capture", desc: "AI chatbots engage visitors in real-time, qualify them instantly, and route hot leads to your CRM." },
  { icon: BarChart3, title: "Instant Lead Scoring", desc: "Every lead is scored on entry using AI — demographics, behavior, and engagement signals combined." },
];

const spotlightFeatures = [
  "Multi-step forms with conditional logic",
  "UTM tracking and source attribution",
  "Duplicate detection and merge",
  "GDPR-compliant consent capture",
  "Webhook and Zapier integration",
  "Custom thank-you redirects",
];

const HowCapture = () => (
  <Layout>
    {/* Hero */}
    <section className="bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(213_50%_25%_/_0.5),transparent_70%)]" />
      <div className="container relative z-10 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold mb-6">
            <span className="text-xs font-bold">STEP 01</span>
          </div>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
            <Target className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Capture Every Lead.{" "}
            <span className="text-gradient-gold">Automatically.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/70">
            AI-powered forms, landing pages, and chatbots work around the clock to capture, score, and route your leads — so you never miss an opportunity.
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
      </div>
    </section>

    {/* Benefits Grid */}
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Key Benefits</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Turn Visitors Into Qualified Leads</h2>
          <p className="mt-4 text-muted-foreground">Every touchpoint is an opportunity. NexusFlo24 makes sure you capture them all.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="group rounded-xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <b.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Feature Spotlight */}
    <section className="bg-surface py-20 md:py-28">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">Feature Spotlight</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Smart Lead Capture, Built for Conversion</h2>
            <p className="mt-4 text-muted-foreground">
              From the first click to CRM entry, every step is optimized. Our AI analyzes visitor intent, personalizes form fields, and scores leads before they even hit your pipeline.
            </p>
            <ul className="mt-6 space-y-3">
              {spotlightFeatures.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Faux UI Mockup */}
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-accent/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted-foreground">Lead Capture Form Builder</span>
            </div>
            <div className="space-y-3 rounded-lg border bg-surface p-4">
              <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-10 w-full rounded border bg-background" />
              <div className="h-10 w-full rounded border bg-background" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 rounded border bg-background" />
                <div className="h-10 rounded border bg-background" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border bg-background" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
              <div className="h-10 w-full rounded bg-accent text-center leading-10 text-sm font-semibold text-accent-foreground">
                Submit & Score Lead →
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-surface p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">AI Score</span>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">87 / 100</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* How It Integrates */}
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Connected Workflow</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Capture Is Just the Beginning</h2>
          <p className="mt-4 text-muted-foreground">
            Once captured, leads flow seamlessly into automated nurture sequences and AI-powered conversion workflows.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-accent/5 p-6">
              <Target className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-bold text-accent">Capture</h3>
              <p className="mt-1 text-xs text-muted-foreground">You are here</p>
            </div>
            <Link to="/how-it-works/nurture" className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <Workflow className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
              <h3 className="font-bold">Nurture</h3>
              <p className="mt-1 text-xs text-muted-foreground">Automated multi-channel flows</p>
            </Link>
            <Link to="/how-it-works/convert" className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
              <h3 className="font-bold">Convert</h3>
              <p className="mt-1 text-xs text-muted-foreground">AI-driven deal closing</p>
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-hero py-20 text-center">
      <div className="container">
        <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Capture More Leads?</h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Start capturing and scoring leads in minutes with NexusFlo24's AI engine.
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

export default HowCapture;
