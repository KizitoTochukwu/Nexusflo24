import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Brain, Users, Mail, MessageSquare, Workflow, LayoutTemplate,
  PenTool, BarChart3, ArrowRight, Shield, Lock, Globe, Zap
} from "lucide-react";

const featureSections = [
  {
    icon: Brain,
    title: "AI Lead Gen Engine",
    desc: "Smart forms and chatbots that capture, qualify, and score leads automatically. AI analyzes visitor behavior to identify your hottest prospects.",
    benefits: ["Auto-qualify leads with AI scoring", "Smart forms that adapt to visitor behavior", "Chatbot lead capture 24/7"],
  },
  {
    icon: Users,
    title: "Smart CRM",
    desc: "A unified view of every contact. Track interactions across email, WhatsApp, SMS, and web — all in one timeline.",
    benefits: ["360° contact profiles", "Deal pipeline management", "Activity tracking & notes"],
  },
  {
    icon: Mail,
    title: "AI Email & WhatsApp Marketing",
    desc: "Create personalized campaigns across email and WhatsApp. AI writes subject lines and message copy that converts.",
    benefits: ["AI-generated copy & subject lines", "A/B testing built-in", "Template library with drag-and-drop editor"],
  },
  {
    icon: MessageSquare,
    title: "Bulk SMS Campaigns",
    desc: "Send targeted SMS blasts to thousands in seconds. Auto-segment audiences and schedule for optimal delivery times.",
    benefits: ["Smart audience segmentation", "Scheduled sends & auto-replies", "Delivery & engagement tracking"],
  },
  {
    icon: Workflow,
    title: "Nurture Flow Builder",
    desc: "Drag-and-drop visual workflow builder. Create multi-step automations across every channel — no code required.",
    benefits: ["Visual drag-and-drop editor", "Multi-channel sequences", "Conditional logic & branching"],
  },
  {
    icon: LayoutTemplate,
    title: "Funnel & Page Builder",
    desc: "Build high-converting landing pages, opt-in forms, and sales funnels in minutes with our visual editor.",
    benefits: ["50+ conversion-optimized templates", "Mobile-responsive by default", "Custom domains & SSL"],
  },
  {
    icon: PenTool,
    title: "AI Copywriter",
    desc: "Generate compelling ad copy, email sequences, and follow-up messages with AI. Save hours every week.",
    benefits: ["Trained on high-converting copy", "Multi-language support", "Brand voice customization"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Real-time dashboards showing what's working. Track leads, campaigns, revenue, and ROI in one place.",
    benefits: ["Real-time conversion tracking", "Campaign ROI attribution", "Custom report builder"],
  },
];

const integrations = [
  "Google Sheets", "Zapier", "Make.com", "Meta Ads", "Google Ads",
  "Stripe", "PayPal", "Mailchimp", "SendGrid", "Twilio",
  "Slack", "HubSpot"
];

const Features = () => (
  <Layout>
    {/* Hero */}
    <section className="bg-hero py-20 text-center">
      <div className="container">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
          <Zap className="h-3.5 w-3.5" /> Platform Features
        </span>
        <h1 className="mt-4 text-4xl font-extrabold text-primary-foreground md:text-5xl">
          Powerful Features for <span className="text-gradient-gold">Smarter Growth</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
          Everything you need to capture, nurture, and convert — powered by AI.
        </p>
      </div>
    </section>

    {/* Feature Sections */}
    <section className="py-20">
      <div className="container space-y-24">
        {featureSections.map((f, i) => (
          <div key={f.title} className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
            <div className={i % 2 === 1 ? "lg:order-2" : ""}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{f.title}</h2>
              <p className="mt-3 text-muted-foreground">{f.desc}</p>
              <ul className="mt-4 space-y-2">
                {f.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`rounded-xl border bg-surface p-8 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
              <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                <f.icon className="h-16 w-16 text-accent/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Integrations */}
    <section className="bg-surface py-20">
      <div className="container text-center">
        <h2 className="text-3xl font-bold">Integrations</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Connect NexusFlo24 with the tools you already use.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {integrations.map((name) => (
            <div key={name} className="rounded-lg border bg-card px-5 py-3 text-sm font-medium shadow-card transition-all hover:shadow-card-hover">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Security */}
    <section className="py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Security & Privacy</h2>
          <p className="mt-3 text-muted-foreground">Your data is safe with enterprise-grade security.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "GDPR Compliant", desc: "Full compliance with EU data protection regulations." },
            { icon: Lock, title: "Encrypted Data", desc: "AES-256 encryption at rest and TLS 1.3 in transit." },
            { icon: Globe, title: "99.9% Uptime SLA", desc: "Enterprise-grade infrastructure with global CDN." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border bg-card p-6 text-center shadow-card">
              <s.icon className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-hero py-16 text-center">
      <div className="container">
        <h2 className="text-3xl font-bold text-primary-foreground">Ready to automate your marketing?</h2>
        <Link to="/register" className="mt-6 inline-block">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
            Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  </Layout>
);

export default Features;
