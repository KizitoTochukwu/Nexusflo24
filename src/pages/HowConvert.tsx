import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, ArrowRight, Brain, Bell, BarChart3, Handshake,
  CheckCircle, Target, Workflow, Zap, Users
} from "lucide-react";

const benefits = [
  { icon: Brain, title: "AI Lead Scoring", desc: "Machine learning analyzes engagement, demographics, and intent signals to rank leads by conversion probability." },
  { icon: Bell, title: "Smart Notifications", desc: "Get notified instantly when a lead hits your scoring threshold — never miss a hot opportunity." },
  { icon: BarChart3, title: "Conversion Analytics", desc: "Track every step from first touch to closed deal with end-to-end funnel reporting and attribution." },
  { icon: Handshake, title: "AI Sales Closer", desc: "Our AI assistant handles objections, books meetings, and follows up — so your team closes faster." },
];

const spotlightFeatures = [
  "Predictive lead scoring with ML models",
  "Real-time pipeline visibility",
  "Automated meeting booking for hot leads",
  "AI-generated follow-up scripts",
  "Revenue attribution by channel and campaign",
  "Deal stage automation and alerts",
];

const HowConvert = () => (
  <Layout>
    {/* Hero */}
    <section className="bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(213_50%_25%_/_0.5),transparent_70%)]" />
      <div className="container relative z-10 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold mb-6">
            <span className="text-xs font-bold">STEP 03</span>
          </div>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
            <TrendingUp className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Convert Leads Into{" "}
            <span className="text-gradient-gold">Revenue.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/70">
            AI scores your leads, alerts your team at the perfect moment, and even closes deals autonomously — turning your pipeline into profit.
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
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Close Deals Faster with AI</h2>
          <p className="mt-4 text-muted-foreground">Let AI identify your hottest leads and help you close them efficiently.</p>
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
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">AI-Powered Conversion Engine</h2>
            <p className="mt-4 text-muted-foreground">
              Our conversion engine combines predictive scoring, real-time alerts, and autonomous AI follow-up to ensure no qualified lead slips through the cracks.
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
          {/* Faux UI Mockup — Conversion Dashboard */}
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-accent/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted-foreground">Conversion Dashboard</span>
            </div>
            <div className="space-y-4 rounded-lg border bg-surface p-4">
              {/* Score card */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-background p-3 text-center">
                  <p className="text-2xl font-bold text-accent">847</p>
                  <p className="text-xs text-muted-foreground">Hot Leads</p>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">32%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">$48K</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
              {/* Lead list */}
              <div className="space-y-2">
                {[
                  { name: "Sarah Chen", score: 94, status: "Ready to Close" },
                  { name: "Marcus J.", score: 87, status: "Meeting Booked" },
                  { name: "Priya Patel", score: 82, status: "Follow-up Sent" },
                ].map((lead) => (
                  <div key={lead.name} className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.status}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">{lead.score}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">AI Closer active — 3 conversations in progress</span>
              </div>
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
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">The Final Step in a Smarter Pipeline</h2>
          <p className="mt-4 text-muted-foreground">
            Convert works hand-in-hand with Capture and Nurture to create a fully automated revenue machine.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Link to="/how-it-works/capture" className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
              <h3 className="font-bold">Capture</h3>
              <p className="mt-1 text-xs text-muted-foreground">AI lead capture engine</p>
            </Link>
            <Link to="/how-it-works/nurture" className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <Workflow className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
              <h3 className="font-bold">Nurture</h3>
              <p className="mt-1 text-xs text-muted-foreground">Automated multi-channel flows</p>
            </Link>
            <div className="rounded-xl border bg-accent/5 p-6">
              <TrendingUp className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-bold text-accent">Convert</h3>
              <p className="mt-1 text-xs text-muted-foreground">You are here</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-hero py-20 text-center">
      <div className="container">
        <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Close More Deals?</h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Let AI identify, engage, and convert your best leads automatically.
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

export default HowConvert;
