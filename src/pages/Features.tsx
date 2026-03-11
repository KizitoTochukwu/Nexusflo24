import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroDashboard from "@/assets/hero-dashboard.png";
import {
  Brain, Users, Mail, MessageSquare, Workflow, LayoutTemplate,
  BarChart3, ArrowRight, Shield, Lock, Globe, Zap, Sparkles,
  PenTool, Bot, Lightbulb, TrendingUp, Target, Send,
  CheckCircle2, Star, Phone, FileText, MousePointerClick,
  Layers, Activity, Clock, UserCheck, Filter, MailOpen,
  Palette, CreditCard, Webhook, Database, BarChart, PieChart
} from "lucide-react";

/* ─── Category Overview Data ─── */
const categories = [
  {
    icon: Target,
    title: "Core Growth Engine",
    desc: "Capture, qualify, and manage every lead from first touch to closed deal.",
    features: ["AI Lead Scoring", "Smart CRM", "Funnel Builder", "Pipeline Management"],
  },
  {
    icon: Send,
    title: "Multichannel Outreach",
    desc: "Reach prospects where they are — email, WhatsApp, and SMS in one workflow.",
    features: ["Email Campaigns", "WhatsApp Marketing", "Bulk SMS", "Auto-Fallback Routing"],
  },
  {
    icon: Sparkles,
    title: "AI Automation",
    desc: "Let AI write your copy, respond to leads, and run campaigns while you sleep.",
    features: ["AI Copywriter", "Smart Sequences", "Chatbot Assistant", "Lead Response AI"],
  },
  {
    icon: Activity,
    title: "Performance & Scale",
    desc: "Real-time analytics, A/B testing, and enterprise-grade infrastructure.",
    features: ["Live Dashboards", "Conversion Tracking", "ROI Attribution", "99.9% Uptime"],
  },
];

/* ─── AI Powerhouse Data ─── */
const aiTools = [
  {
    icon: PenTool,
    title: "AI Copywriter",
    desc: "Generate high-converting ad copy, email sequences, and follow-ups in seconds. Trained on millions of top-performing campaigns.",
    metric: "Save 10+ hrs/week",
  },
  {
    icon: Lightbulb,
    title: "AI Campaign Assistant",
    desc: "Get intelligent suggestions for audience targeting, send times, and message variations that maximize open and click rates.",
    metric: "2x open rates",
  },
  {
    icon: MessageSquare,
    title: "AI Lead Response",
    desc: "Instant, contextual replies to inbound leads across every channel. Never leave a hot prospect waiting again.",
    metric: "<30s response time",
  },
  {
    icon: Bot,
    title: "GPT Sales Chatbot",
    desc: "Deploy an AI assistant on your funnels that qualifies leads, answers FAQs, and books meetings — 24/7.",
    metric: "3x more bookings",
  },
];

/* ─── Integrations ─── */
const integrations = [
  { name: "Google Sheets", icon: FileText },
  { name: "Zapier", icon: Webhook },
  { name: "Make.com", icon: Layers },
  { name: "Meta Ads", icon: MousePointerClick },
  { name: "Google Ads", icon: TrendingUp },
  { name: "Stripe", icon: CreditCard },
  { name: "Mailchimp", icon: MailOpen },
  { name: "SendGrid", icon: Send },
  { name: "Twilio", icon: Phone },
  { name: "Slack", icon: MessageSquare },
  { name: "HubSpot", icon: Database },
  { name: "PayPal", icon: CreditCard },
];

const Features = () => (
  <Layout>
    {/* ═══════════════════════ HERO ═══════════════════════ */}
    <section className="bg-hero py-24 pb-8 lg:pb-0 overflow-hidden">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-6 border-gold/30 bg-navy-light/60 text-gold hover:bg-navy-light/80">
            <Zap className="mr-1.5 h-3.5 w-3.5" /> All-in-One AI Marketing Platform
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Turn Visitors Into Revenue{" "}
            <span className="text-gradient-gold">— Automatically</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70">
            AI-powered lead capture, nurture sequences, and multichannel campaigns
            that close deals while you focus on growing your business.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold px-8 text-base">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 text-base">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
        {/* Product Preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-4 rounded-2xl bg-accent/10 blur-3xl" />
          <div className="relative rounded-xl border border-primary-foreground/10 shadow-2xl overflow-hidden" style={{ transform: "perspective(1200px) rotateX(2deg)" }}>
            <img src={heroDashboard} alt="NexusFlo24 Dashboard" className="w-full" loading="eager" />
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ CATEGORY OVERVIEW ═══════════════════════ */}
    <section className="py-24">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4"><Layers className="mr-1.5 h-3.5 w-3.5" /> Platform Overview</Badge>
          <h2 className="text-3xl font-extrabold md:text-4xl">Everything You Need to Grow</h2>
          <p className="mt-3 text-muted-foreground">Four pillars. One platform. Zero duct-tape.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <div key={c.title} className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <c.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {c.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: AI LEAD GEN ═══════════════════════ */}
    <section className="bg-surface py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <Brain className="mr-1.5 h-3.5 w-3.5" /> AI Lead Generation
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Convert 3x More Leads{" "}
              <span className="text-gradient-gold">on Autopilot</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Smart forms and AI chatbots that capture, qualify, and score every visitor
              automatically. Know exactly which prospects are ready to buy — before you even pick up the phone.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">87%</p>
                <p className="text-xs text-muted-foreground">Qualification accuracy</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">24/7</p>
                <p className="text-xs text-muted-foreground">Chatbot capture</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["Auto-qualify leads with AI scoring", "Smart forms that adapt to visitor behavior", "Chatbot captures leads around the clock"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
          {/* Faux Lead Card UI */}
          <div className="rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Incoming Leads</h4>
              <Badge variant="secondary" className="text-xs">Live</Badge>
            </div>
            {[
              { name: "Sarah Johnson", score: 92, source: "Landing Page", status: "Hot" },
              { name: "Michael Chen", score: 78, source: "Chatbot", status: "Warm" },
              { name: "Emma Williams", score: 64, source: "Form", status: "Warm" },
            ].map((lead) => (
              <div key={lead.name} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">{lead.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.status === "Hot" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>{lead.status}</span>
                  <span className="text-sm font-bold">{lead.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: SMART CRM ═══════════════════════ */}
    <section className="py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Faux CRM UI */}
          <div className="order-2 lg:order-1 rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Contact Timeline</h4>
              <Badge variant="secondary" className="text-xs">CRM</Badge>
            </div>
            <div className="mb-4 flex items-center gap-4 border-b pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">SJ</div>
              <div>
                <p className="font-semibold">Sarah Johnson</p>
                <p className="text-xs text-muted-foreground">sarah@example.com · +1 (555) 123-4567</p>
              </div>
              <Badge className="ml-auto bg-accent/10 text-accent border-accent/30 hover:bg-accent/15">Score: 92</Badge>
            </div>
            {[
              { icon: MailOpen, label: "Opened Campaign: Summer Sale", time: "2 min ago" },
              { icon: MousePointerClick, label: "Clicked CTA: Get 30% Off", time: "5 min ago" },
              { icon: MessageSquare, label: "WhatsApp reply received", time: "1 hr ago" },
              { icon: UserCheck, label: "Lead qualified by AI", time: "3 hrs ago" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted"><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div className="flex-1">
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Smart CRM
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Every Interaction.{" "}
              <span className="text-gradient-gold">One Timeline.</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Stop switching between 6 tabs. See every email open, WhatsApp reply,
              form submission, and deal stage change in a single 360° contact view.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">360°</p>
                <p className="text-xs text-muted-foreground">Contact view</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">5</p>
                <p className="text-xs text-muted-foreground">Channels unified</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["Full interaction history across all channels", "Deal pipeline with drag-and-drop stages", "AI-powered next-best-action suggestions"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: EMAIL + WHATSAPP ═══════════════════════ */}
    <section className="bg-surface py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Multichannel Campaigns
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Email + WhatsApp + SMS{" "}
              <span className="text-gradient-gold">in One Click</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Create personalized campaigns across every channel. AI writes the copy,
              picks the best send time, and auto-falls back to SMS when emails bounce.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">42%</p>
                <p className="text-xs text-muted-foreground">Avg. open rate</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">3x</p>
                <p className="text-xs text-muted-foreground">More replies</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["AI-generated subject lines & body copy", "Smart send-time optimization", "Auto-fallback: Email → WhatsApp → SMS"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
          {/* Faux Email Editor UI */}
          <div className="rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Campaign Editor</h4>
              <Badge variant="secondary" className="text-xs">Draft</Badge>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium">🎉 Your exclusive 30% off expires tonight</p>
              </div>
              <div className="flex gap-2">
                {["Email", "WhatsApp", "SMS"].map((ch) => (
                  <div key={ch} className={`rounded-full px-3 py-1 text-xs font-medium ${ch === "Email" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{ch}</div>
                ))}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm">Hi <span className="font-medium text-accent">{"{{first_name}}"}</span>,</p>
                <p className="mt-2 text-sm text-muted-foreground">We noticed you were checking out our Pro plan. For the next 24 hours, use code <span className="font-bold text-accent">GROW30</span> for 30% off your first 3 months.</p>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground">Claim Your Discount →</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI-generated copy</span>
                <span>Sending to 2,847 contacts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: NURTURE FLOW BUILDER ═══════════════════════ */}
    <section className="py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Faux Flow Builder UI */}
          <div className="order-2 lg:order-1 rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Automation Flow</h4>
              <Badge className="bg-accent/10 text-accent border-accent/30 hover:bg-accent/15 text-xs">Active</Badge>
            </div>
            <div className="space-y-3">
              {[
                { icon: Zap, label: "Trigger: New lead from funnel", color: "bg-accent/10 text-accent" },
                { icon: Clock, label: "Wait 5 minutes", color: "bg-muted text-muted-foreground" },
                { icon: Mail, label: "Send welcome email", color: "bg-blue-500/10 text-blue-600" },
                { icon: Filter, label: "If: Opened email?", color: "bg-purple-500/10 text-purple-600" },
                { icon: MessageSquare, label: "Yes → Send WhatsApp", color: "bg-green-500/10 text-green-600" },
                { icon: Phone, label: "No → Send SMS reminder", color: "bg-orange-500/10 text-orange-600" },
              ].map((step, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.color}`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm">{step.label}</p>
                  </div>
                  {i < 5 && <div className="ml-6 h-3 border-l-2 border-dashed border-border" />}
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <Workflow className="mr-1.5 h-3.5 w-3.5" /> Nurture Flow Builder
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Build Sequences That{" "}
              <span className="text-gradient-gold">Close Deals</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Drag-and-drop visual workflows that send the right message, on the right
              channel, at the right time. No code. No guesswork.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">10+</p>
                <p className="text-xs text-muted-foreground">hrs saved/week</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">5</p>
                <p className="text-xs text-muted-foreground">Channels</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["Visual drag-and-drop editor", "Multi-channel sequences with branching", "Trigger on any event: form fill, page visit, email open"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: FUNNEL BUILDER ═══════════════════════ */}
    <section className="bg-surface py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" /> Funnel & Page Builder
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Landing Pages That{" "}
              <span className="text-gradient-gold">Actually Convert</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Build high-converting landing pages, opt-in forms, and complete sales funnels
              in minutes. Mobile-responsive, SEO-ready, custom domains included.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">50+</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">&lt; 60s</p>
                <p className="text-xs text-muted-foreground">To publish</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["Drag-and-drop page builder", "Conversion-optimized templates", "Custom domains with free SSL"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
          {/* Faux Funnel UI */}
          <div className="rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Funnel: Product Launch</h4>
              <Badge className="bg-accent/10 text-accent border-accent/30 hover:bg-accent/15 text-xs">Published</Badge>
            </div>
            <div className="space-y-4">
              {[
                { step: "Landing Page", visitors: "12,847", rate: "100%" },
                { step: "Opt-in Form", visitors: "4,215", rate: "32.8%" },
                { step: "Sales Page", visitors: "2,108", rate: "50.0%" },
                { step: "Checkout", visitors: "634", rate: "30.1%" },
                { step: "Thank You", visitors: "571", rate: "90.1%" },
              ].map((s, i) => (
                <div key={s.step}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                      <span className="text-sm font-medium">{s.step}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{s.visitors}</span>
                      <span className="font-semibold text-accent">{s.rate}</span>
                    </div>
                  </div>
                  {i < 4 && (
                    <div className="ml-3 mt-1 mb-1 h-3 border-l-2 border-dashed border-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SPOTLIGHT: ANALYTICS ═══════════════════════ */}
    <section className="py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Faux Analytics UI */}
          <div className="order-2 lg:order-1 rounded-xl border bg-card p-6 shadow-card-hover">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Performance Overview</h4>
              <Badge variant="secondary" className="text-xs">Last 30 days</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Revenue", value: "$48,290", change: "+23%" },
                { label: "Leads", value: "1,847", change: "+31%" },
                { label: "Conversions", value: "634", change: "+18%" },
                { label: "ROI", value: "340%", change: "+12%" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-xs font-medium text-green-600">{m.change}</p>
                </div>
              ))}
            </div>
            {/* Mini chart bars */}
            <div className="flex items-end gap-1.5 h-20">
              {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 95, 88].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-accent/20 transition-all hover:bg-accent/40" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Jan</span><span>Jun</span><span>Dec</span>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Badge className="mb-4 border-accent/30 bg-accent/10 text-accent hover:bg-accent/15">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics & Reporting
            </Badge>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Know Exactly What's{" "}
              <span className="text-gradient-gold">Driving Revenue</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Real-time dashboards that show you what's working and what's not. Track
              leads, campaigns, revenue, and ROI attribution — all in one place.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">Real-time</p>
                <p className="text-xs text-muted-foreground">Data updates</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
                <p className="text-2xl font-extrabold text-accent">340%</p>
                <p className="text-xs text-muted-foreground">Avg. ROI</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {["Campaign ROI attribution", "Real-time conversion tracking", "Custom report builder"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* ═══════════════════════ AI POWERHOUSE ═══════════════════════ */}
    <section className="bg-hero py-24">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge className="mb-4 border-gold/30 bg-navy-light/60 text-gold hover:bg-navy-light/80">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Powerhouse
          </Badge>
          <h2 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">
            AI That Works <span className="text-gradient-gold">While You Sleep</span>
          </h2>
          <p className="mt-3 text-primary-foreground/70">
            Four AI engines built into every plan. Write copy, respond to leads,
            optimize campaigns, and close deals — automatically.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {aiTools.map((tool) => (
            <div key={tool.title} className="group relative rounded-xl border border-primary-foreground/10 bg-navy-light/40 p-6 transition-all hover:border-accent/40 hover:shadow-gold">
              <div className="absolute inset-0 rounded-xl bg-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <tool.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-primary-foreground">{tool.title}</h3>
                <p className="mt-2 text-sm text-primary-foreground/60 leading-relaxed">{tool.desc}</p>
                <div className="mt-4">
                  <Badge className="border-accent/30 bg-accent/10 text-accent hover:bg-accent/15 text-xs">
                    <Star className="mr-1 h-3 w-3" /> {tool.metric}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ═══════════════════════ INTEGRATIONS ═══════════════════════ */}
    <section className="bg-surface py-24">
      <div className="container text-center">
        <Badge variant="secondary" className="mb-4"><Palette className="mr-1.5 h-3.5 w-3.5" /> Integrations</Badge>
        <h2 className="text-3xl font-extrabold md:text-4xl">Works With the Tools You Already Love</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Connect NexusFlo24 to your existing stack in minutes. No engineering required.
        </p>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {integrations.map((int) => (
            <div key={int.name} className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-accent/10">
                <int.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent" />
              </div>
              <span className="text-xs font-medium">{int.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ═══════════════════════ SECURITY ═══════════════════════ */}
    <section className="py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Enterprise-Grade Security</h2>
          <p className="mt-3 text-muted-foreground">Your data is protected with the same standards used by Fortune 500 companies.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "GDPR Compliant", desc: "Full compliance with EU data protection regulations. Data residency controls and privacy-first defaults." },
            { icon: Lock, title: "256-bit Encryption", desc: "AES-256 encryption at rest and TLS 1.3 in transit. Your data is unreadable to anyone but you." },
            { icon: Globe, title: "99.9% Uptime SLA", desc: "Enterprise-grade infrastructure with global CDN, automatic failover, and 24/7 monitoring." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border bg-card p-8 text-center shadow-card transition-all hover:shadow-card-hover">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                <s.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ═══════════════════════ CTA ═══════════════════════ */}
    <section className="bg-hero py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">
            Ready to 3x Your Conversions?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/70">
            Join thousands of businesses automating their growth with NexusFlo24.
            Start free — no credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold px-8 text-base">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 text-base">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default Features;
