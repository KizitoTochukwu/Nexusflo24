import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Workflow, ArrowRight, Mail, MessageSquare, Smartphone, Clock,
  CheckCircle, Target, TrendingUp, Zap, GitBranch
} from "lucide-react";

const benefits = [
  { icon: Mail, title: "AI Email Sequences", desc: "Personalized drip campaigns written by AI that adapt tone, timing, and content based on lead behavior." },
  { icon: MessageSquare, title: "WhatsApp Automation", desc: "Reach leads on the channel they prefer with automated WhatsApp messages and quick replies." },
  { icon: Smartphone, title: "SMS Follow-Ups", desc: "Time-sensitive reminders and offers delivered via SMS with smart fallback logic." },
  { icon: Clock, title: "Perfect Timing Engine", desc: "AI determines the optimal send time for each lead based on engagement history and timezone." },
];

const spotlightFeatures = [
  "Visual drag-and-drop flow builder",
  "Conditional branching (if/then logic)",
  "Multi-channel: Email + WhatsApp + SMS in one flow",
  "Delay steps with smart scheduling",
  "A/B testing for subject lines and content",
  "Real-time flow analytics and drop-off tracking",
];

const HowNurture = () => (
  <Layout>
    {/* Hero */}
    <section className="bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(213_50%_25%_/_0.5),transparent_70%)]" />
      <div className="container relative z-10 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold mb-6">
            <span className="text-xs font-bold">STEP 02</span>
          </div>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
            <Workflow className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Nurture Leads on{" "}
            <span className="text-gradient-gold">Autopilot.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/70">
            Automated multi-channel flows keep your leads engaged with the right message, on the right channel, at the right time — all powered by AI.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-8">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/book/30-discovery-call-f8839f">
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
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Keep Leads Warm Without Lifting a Finger</h2>
          <p className="mt-4 text-muted-foreground">Set it once, and let AI handle the follow-up across every channel.</p>
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
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Visual Flow Builder That Thinks for You</h2>
            <p className="mt-4 text-muted-foreground">
              Build sophisticated nurture sequences with our drag-and-drop builder. Add conditions, delays, and multi-channel steps — the AI optimizes delivery for maximum engagement.
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
          {/* Faux UI Mockup — Flow Builder */}
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-accent/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted-foreground">Automation Flow Builder</span>
            </div>
            <div className="space-y-3 rounded-lg border bg-surface p-4">
              {/* Trigger */}
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Zap className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-semibold">Trigger: New Lead Captured</p>
                  <p className="text-xs text-muted-foreground">From any form or landing page</p>
                </div>
              </div>
              {/* Arrow */}
              <div className="flex justify-center"><div className="h-6 w-px bg-border" /></div>
              {/* Email step */}
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs font-semibold">Send Welcome Email</p>
                  <p className="text-xs text-muted-foreground">AI-personalized • 98% delivery</p>
                </div>
              </div>
              <div className="flex justify-center"><div className="h-6 w-px bg-border" /></div>
              {/* Delay */}
              <div className="flex items-center gap-3 rounded-lg border border-dashed bg-background p-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold">Wait 2 Days</p>
                  <p className="text-xs text-muted-foreground">Smart timing enabled</p>
                </div>
              </div>
              <div className="flex justify-center"><div className="h-6 w-px bg-border" /></div>
              {/* Branch */}
              <div className="flex items-center gap-3 rounded-lg border bg-accent/5 p-3">
                <GitBranch className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-semibold">Condition: Opened Email?</p>
                  <p className="text-xs text-muted-foreground">Yes → WhatsApp · No → SMS reminder</p>
                </div>
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
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">From Capture to Conversion</h2>
          <p className="mt-4 text-muted-foreground">
            Nurture flows connect captured leads directly to your conversion engine, creating a seamless pipeline.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Link to="/how-it-works/capture" className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
              <h3 className="font-bold">Capture</h3>
              <p className="mt-1 text-xs text-muted-foreground">AI lead capture engine</p>
            </Link>
            <div className="rounded-xl border bg-accent/5 p-6">
              <Workflow className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-bold text-accent">Nurture</h3>
              <p className="mt-1 text-xs text-muted-foreground">You are here</p>
            </div>
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
        <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Nurture Leads on Autopilot?</h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Build your first automated flow in minutes — no code required.
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

export default HowNurture;
