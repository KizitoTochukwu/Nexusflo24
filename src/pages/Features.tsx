import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Brain, Users, Mail, MessageSquare, Workflow, LayoutTemplate,
  BarChart3, ArrowRight, Shield, Lock, Globe, Zap, Sparkles,
  Bot, PenTool, Target, TrendingUp, Phone, Send, MousePointerClick,
  Star, CheckCircle2, Activity, Layers, Calendar, FileText,
  CreditCard, Share2, Database, BarChart, PieChart, LineChart
} from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.png";

/* ─── Category Overview ─── */
const categories = [
  {
    icon: Target,
    title: "Core Growth Engine",
    desc: "Capture, qualify, and manage every lead with AI-powered forms, smart CRM, and conversion-optimized funnels.",
    features: ["AI Lead Scoring", "Smart CRM", "Funnel Builder"],
  },
  {
    icon: Send,
    title: "Multichannel Communication",
    desc: "Reach prospects on their preferred channel — email, WhatsApp, or SMS — from a single unified inbox.",
    features: ["Email Campaigns", "WhatsApp API", "Bulk SMS"],
  },
  {
    icon: Sparkles,
    title: "AI Automation",
    desc: "Let AI write your copy, nurture your leads, and close deals while you sleep. Zero manual follow-ups.",
    features: ["AI Copywriter", "Nurture Flows", "Auto Follow-ups"],
  },
  {
    icon: BarChart3,
    title: "Performance & Scale",
    desc: "Real-time analytics, A/B testing, and attribution reporting so you know exactly what's driving revenue.",
    features: ["Live Dashboards", "ROI Attribution", "A/B Testing"],
  },
];

/* ─── Spotlight Features ─── */
const spotlights = [
  {
    badge: "AI Lead Generation",
    headline: "Convert 3× more visitors into qualified leads",
    copy: "Smart forms adapt in real-time based on visitor behavior. AI scores every lead instantly so your team focuses only on the hottest prospects — not cold lists.",
    stat: "3×",
    statLabel: "higher conversion rate",
    reversed: false,
    bgClass: "",
    mockup: "leadgen",
  },
  {
    badge: "Smart CRM",
    headline: "See every interaction in one timeline",
    copy: "360° contact profiles with every email, WhatsApp message, SMS, page visit, and deal stage — unified in a single view. No more switching between 5 tools.",
    stat: "360°",
    statLabel: "contact visibility",
    reversed: true,
    bgClass: "bg-surface",
    mockup: "crm",
  },
  {
    badge: "Email & WhatsApp Marketing",
    headline: "Send campaigns that actually get opened",
    copy: "AI writes subject lines and message copy proven to convert. Send personalized campaigns across email and WhatsApp with built-in A/B testing and smart scheduling.",
    stat: "47%",
    statLabel: "avg. open rate",
    reversed: false,
    bgClass: "",
    mockup: "email",
  },
  {
    badge: "Nurture Flow Builder",
    headline: "Automate the entire customer journey",
    copy: "Drag-and-drop visual workflows that trigger across every channel. Set conditions, delays, and branching logic — no code required. Leads nurture themselves.",
    stat: "10×",
    statLabel: "time saved weekly",
    reversed: true,
    bgClass: "bg-surface",
    mockup: "flow",
  },
  {
    badge: "Funnel & Page Builder",
    headline: "Build landing pages that print revenue",
    copy: "50+ conversion-optimized templates. Mobile-responsive by default. Custom domains, SSL, and built-in analytics — launch in minutes, not weeks.",
    stat: "50+",
    statLabel: "ready-made templates",
    reversed: false,
    bgClass: "",
    mockup: "funnel",
  },
  {
    badge: "Analytics & Reporting",
    headline: "Know exactly what's driving your revenue",
    copy: "Real-time dashboards with campaign ROI, funnel conversion rates, lead source attribution, and custom reports. Make data-driven decisions in seconds.",
    stat: "Real-time",
    statLabel: "performance insights",
    reversed: true,
    bgClass: "bg-surface",
    mockup: "analytics",
  },
];

/* ─── AI Tools ─── */
const aiTools = [
  {
    icon: PenTool,
    title: "AI Copywriter",
    desc: "Generate compelling ad copy, email sequences, and follow-up messages trained on high-converting patterns. Multi-language, brand-voice aware.",
  },
  {
    icon: Target,
    title: "AI Campaign Assistant",
    desc: "Get AI-recommended audiences, send times, and channel mixes that maximize your campaign ROI automatically.",
  },
  {
    icon: MessageSquare,
    title: "AI Lead Response",
    desc: "Instant AI-crafted reply suggestions for every inbound message. Respond faster, close more deals, never miss a lead.",
  },
  {
    icon: Bot,
    title: "AI Chatbot / GPT Assistant",
    desc: "24/7 conversational lead capture and qualification. Your AI sales rep that never sleeps — deployed on your site in minutes.",
  },
];

/* ─── Integrations ─── */
const integrations = [
  { name: "Google Sheets", icon: FileText },
  { name: "Zapier", icon: Zap },
  { name: "Make.com", icon: Workflow },
  { name: "Meta Ads", icon: Share2 },
  { name: "Google Ads", icon: MousePointerClick },
  { name: "Stripe", icon: CreditCard },
  { name: "Mailchimp", icon: Mail },
  { name: "SendGrid", icon: Send },
  { name: "Twilio", icon: Phone },
  { name: "Slack", icon: MessageSquare },
  { name: "HubSpot", icon: Database },
  { name: "Calendly", icon: Calendar },
];

/* ─── Mock UI Components ─── */
const LeadGenMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">Live Lead Capture</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <Activity className="h-3 w-3" /> Active
      </span>
    </div>
    <div className="space-y-2">
      {[
        { name: "Sarah Mitchell", score: 92, time: "2m ago" },
        { name: "James Park", score: 78, time: "8m ago" },
        { name: "Aisha Okonkwo", score: 85, time: "14m ago" },
      ].map((l) => (
        <div key={l.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{l.name[0]}</div>
            <span className="text-sm font-medium text-foreground">{l.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-accent" />
              <span className="text-xs font-semibold text-accent">{l.score}</span>
            </div>
            <span className="text-xs text-muted-foreground">{l.time}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 pt-1">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span className="text-xs text-muted-foreground">AI auto-qualified 12 leads today</span>
    </div>
  </div>
);

const CrmMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">SM</div>
      <div>
        <p className="text-sm font-semibold text-foreground">Sarah Mitchell</p>
        <p className="text-xs text-muted-foreground">sarah@company.co · Score: 92</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {["Proposal Sent", "$4,200", "3 Touchpoints"].map((v) => (
        <div key={v} className="rounded-lg bg-muted px-2 py-1.5 text-center">
          <span className="text-xs font-medium text-foreground">{v}</span>
        </div>
      ))}
    </div>
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Recent Activity</p>
      {[
        { icon: Mail, text: "Opened pricing email", time: "1h ago" },
        { icon: MousePointerClick, text: "Clicked CTA link", time: "3h ago" },
        { icon: MessageSquare, text: "WhatsApp reply received", time: "Yesterday" },
      ].map((a) => (
        <div key={a.text} className="flex items-center gap-2 text-xs text-muted-foreground">
          <a.icon className="h-3 w-3 text-accent" />
          <span className="text-foreground">{a.text}</span>
          <span className="ml-auto">{a.time}</span>
        </div>
      ))}
    </div>
  </div>
);

const EmailMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">Campaign: Spring Promo</span>
      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Sending</span>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        { label: "Sent", value: "2,340" },
        { label: "Opened", value: "47.2%" },
        { label: "Clicked", value: "12.8%" },
      ].map((s) => (
        <div key={s.label} className="rounded-lg bg-muted px-2 py-2">
          <p className="text-lg font-bold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium text-foreground mb-1">Subject: Your exclusive 30% off ends tonight 🔥</p>
      <p className="text-xs text-muted-foreground">Hi {'{{first_name}}'}, we've reserved a special offer just for you...</p>
      <div className="mt-2 flex gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-accent"><Sparkles className="h-3 w-3" /> AI-generated</span>
        <span className="inline-flex items-center gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" /> A/B Winner</span>
      </div>
    </div>
  </div>
);

const FlowMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <span className="text-sm font-semibold text-foreground">Lead Nurture Flow</span>
    <div className="space-y-2">
      {[
        { label: "Trigger: Form Submitted", color: "bg-accent/20 text-accent border-accent/30" },
        { label: "Wait 1 hour", color: "bg-muted text-muted-foreground border-border" },
        { label: "Send Welcome Email", color: "bg-blue-50 text-blue-700 border-blue-200" },
        { label: "If opened → Send WhatsApp", color: "bg-green-50 text-green-700 border-green-200" },
        { label: "If not → SMS Reminder", color: "bg-orange-50 text-orange-700 border-orange-200" },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className={`h-3 w-3 rounded-full border-2 ${step.color}`} />
            {i < 4 && <div className="h-4 w-px bg-border" />}
          </div>
          <span className={`rounded-md border px-3 py-1.5 text-xs font-medium ${step.color}`}>{step.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const FunnelMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">Sales Funnel</span>
      <span className="text-xs text-muted-foreground">4 steps · Live</span>
    </div>
    <div className="space-y-2">
      {[
        { label: "Landing Page", visitors: "4,280", rate: "100%" },
        { label: "Lead Capture", visitors: "1,926", rate: "45%" },
        { label: "Sales Page", visitors: "891", rate: "46%" },
        { label: "Checkout", visitors: "312", rate: "35%" },
      ].map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.visitors}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: s.rate }} />
            </div>
          </div>
          <span className="text-xs font-semibold text-accent w-8 text-right">{s.rate}</span>
        </div>
      ))}
    </div>
  </div>
);

const AnalyticsMockup = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">Revenue Dashboard</span>
      <span className="text-xs text-muted-foreground">Last 30 days</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Revenue", value: "$24,580", icon: TrendingUp, change: "+18%" },
        { label: "Leads", value: "1,247", icon: Users, change: "+32%" },
        { label: "Conversions", value: "312", icon: CheckCircle2, change: "+24%" },
        { label: "ROI", value: "4.2×", icon: BarChart, change: "+15%" },
      ].map((m) => (
        <div key={m.label} className="rounded-lg bg-muted px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <m.icon className="h-3 w-3 text-accent" />
            <span className="text-xs text-muted-foreground">{m.label}</span>
          </div>
          <p className="text-sm font-bold text-foreground">{m.value}</p>
          <span className="text-xs font-medium text-green-600">{m.change}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-4 pt-1">
      {[LineChart, BarChart, PieChart].map((Icon, i) => (
        <Icon key={i} className={`h-5 w-5 ${i === 0 ? "text-accent" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  </div>
);

const mockups: Record<string, () => JSX.Element> = {
  leadgen: LeadGenMockup,
  crm: CrmMockup,
  email: EmailMockup,
  flow: FlowMockup,
  funnel: FunnelMockup,
  analytics: AnalyticsMockup,
};

const Features = () => (
  <Layout>
    {/* ─── HERO ─── */}
    <section className="bg-hero py-20 pb-32 text-center relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, hsl(46 67% 52% / 0.08), transparent)" }} />
      <div className="container relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold animate-fade-in">
          <Zap className="h-3.5 w-3.5" /> The AI Marketing Platform
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-primary-foreground md:text-5xl lg:text-6xl leading-tight">
          Every tool you need to<br />
          <span className="text-gradient-gold">capture, nurture & convert</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-primary-foreground/70">
          AI-powered lead generation, multichannel campaigns, smart CRM, and conversion analytics — unified in one platform that grows your revenue on autopilot.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-8">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-navy-light text-base px-8">
              Book a Demo
            </Button>
          </Link>
        </div>

        {/* Product preview */}
        <div className="mt-16 mx-auto max-w-4xl">
          <div className="relative rounded-xl overflow-hidden border border-gold/20 shadow-[0_20px_80px_-20px_hsl(46_67%_52%_/_0.25)]">
            <img
              src={heroDashboard}
              alt="NexusFlo24 dashboard showing leads, campaigns, and analytics"
              className="w-full"
              loading="eager"
            />
            {/* Glass overlay gradient */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>

    {/* ─── CATEGORY OVERVIEW ─── */}
    <section className="py-20 -mt-16 relative z-20">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-all duration-300 group"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <cat.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{cat.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{cat.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {cat.features.map((f) => (
                  <span key={f} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── SPOTLIGHT FEATURES ─── */}
    {spotlights.map((s) => {
      const Mockup = mockups[s.mockup];
      return (
        <section key={s.badge} className={`py-20 ${s.bgClass}`}>
          <div className="container">
            <div className={`grid items-center gap-12 lg:grid-cols-2 ${s.reversed ? "" : ""}`}>
              {/* Text */}
              <div className={s.reversed ? "lg:order-2" : ""}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wider">
                  <Layers className="h-3 w-3" /> {s.badge}
                </span>
                <h2 className="mt-4 text-3xl font-extrabold md:text-4xl leading-tight">{s.headline}</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed text-lg">{s.copy}</p>
                <div className="mt-6 flex items-baseline gap-3">
                  <span className="text-4xl font-black text-accent">{s.stat}</span>
                  <span className="text-sm font-medium text-muted-foreground">{s.statLabel}</span>
                </div>
              </div>
              {/* Mockup */}
              <div className={s.reversed ? "lg:order-1" : ""}>
                <Mockup />
              </div>
            </div>
          </div>
        </section>
      );
    })}

    {/* ─── AI POWERHOUSE ─── */}
    <section className="bg-hero py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 60% at 50% 50%, hsl(46 67% 52% / 0.06), transparent)" }} />
      <div className="container relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-primary-foreground md:text-4xl">
            Your AI marketing team,<br />
            <span className="text-gradient-gold">built right in</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/60">
            Four AI tools that write, strategize, respond, and sell — so you can focus on growing your business.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {aiTools.map((tool) => (
            <div
              key={tool.title}
              className="rounded-xl border border-gold/20 bg-navy-light/40 p-6 backdrop-blur-sm hover:border-gold/40 transition-all duration-300 group"
              style={{ boxShadow: "0 0 30px -10px hsl(46 67% 52% / 0.1)" }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors">
                <tool.icon className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-primary-foreground">{tool.title}</h3>
              <p className="mt-2 text-sm text-primary-foreground/60 leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── INTEGRATIONS ─── */}
    <section className="bg-surface py-20">
      <div className="container text-center">
        <h2 className="text-3xl font-extrabold">Works with the tools you love</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Connect NexusFlo24 to your existing stack in one click. No code required.
        </p>
        <div className="mt-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-3xl mx-auto">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-300"
            >
              <int.icon className="h-6 w-6 text-accent" />
              <span className="text-xs font-medium text-foreground">{int.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── SECURITY ─── */}
    <section className="py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-3xl font-extrabold">Enterprise-grade security</h2>
          <p className="mt-3 text-muted-foreground">Your data is protected with the same infrastructure trusted by Fortune 500 companies.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
          {[
            { icon: Shield, title: "GDPR Compliant", desc: "Full compliance with EU data protection regulations. User consent, data export, and right-to-delete built in." },
            { icon: Lock, title: "AES-256 Encryption", desc: "Military-grade encryption at rest and TLS 1.3 in transit. Your data is secure at every layer." },
            { icon: Globe, title: "99.9% Uptime SLA", desc: "Enterprise infrastructure with global CDN, auto-scaling, and 24/7 monitoring." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6 text-center shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <s.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── CTA ─── */}
    <section className="bg-hero py-20 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 60% at 50% 60%, hsl(46 67% 52% / 0.08), transparent)" }} />
      <div className="container relative z-10">
        <h2 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">
          Stop losing leads.<br />
          <span className="text-gradient-gold">Start converting on autopilot.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Join thousands of businesses using NexusFlo24 to automate their marketing and grow revenue faster.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-8">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-navy-light text-base px-8">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default Features;
