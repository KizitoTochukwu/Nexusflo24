import { useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fbqTrackCustom } from "@/lib/analytics/metaPixel";
import heroDashboard from "@/assets/hero-dashboard.png";
import StickyFeatureNav, { type NavItem } from "@/components/features/StickyFeatureNav";
import {
  Reveal,
  FeatureSection,
  CapabilityList,
  MockPanel,
  StatusBadge,
  type StatusLabel,
} from "@/components/features/parts";
import {
  ArrowRight, Users, Mail, MessageSquare, Workflow, CalendarCheck,
  BarChart3, Sparkles, Zap, Layers, Bot, Plug, ShieldCheck, Target,
  LayoutTemplate, Database, Send, Clock, CheckCircle2, Lock, KeyRound,
  FileText, Eye, Calculator, MousePointerClick, PhoneCall, CreditCard,
  Table2, Slack, Megaphone, UserPlus,
} from "lucide-react";

const DEMO_PATH = "/book/30-minute-discovery-call-9f5d5f";

/* ── Section 2: capability strip ── */
const capabilities = [
  { label: "CRM", icon: Users },
  { label: "WhatsApp", icon: MessageSquare },
  { label: "Email", icon: Mail },
  { label: "SMS", icon: Send },
  { label: "Funnels", icon: LayoutTemplate },
  { label: "Automations", icon: Workflow },
  { label: "Bookings", icon: CalendarCheck },
  { label: "Nexus AI", icon: Sparkles },
  { label: "Analytics", icon: BarChart3 },
  { label: "MCP", icon: Plug },
];

/* ── Section 3: journey ── */
const journey = [
  { n: "01", icon: Target, title: "Capture", desc: "Collect leads from landing pages, forms, campaigns and AI conversations." },
  { n: "02", icon: Database, title: "Organise", desc: "Store contact details, activities, lead scores and opportunities in the CRM." },
  { n: "03", icon: Workflow, title: "Automate", desc: "Trigger personalised email, WhatsApp and SMS follow-up based on lead behaviour." },
  { n: "04", icon: CheckCircle2, title: "Convert", desc: "Book appointments, move opportunities through the pipeline and measure results." },
];

/* ── Section 4: sticky nav ── */
const navItems: NavItem[] = [
  { id: "lead-capture", label: "Lead Capture" },
  { id: "crm", label: "CRM" },
  { id: "messaging", label: "Messaging" },
  { id: "automations", label: "Automations" },
  { id: "bookings", label: "Bookings" },
  { id: "ai-mcp", label: "AI and MCP" },
  { id: "analytics", label: "Analytics" },
  { id: "templates", label: "Templates" },
  { id: "integrations", label: "Integrations" },
];

/* ── Section 8: workflow example ── */
const workflowSteps = [
  { kind: "Trigger", label: "New lead captured" },
  { kind: "Action", label: "Create or update CRM contact" },
  { kind: "Action", label: "Send confirmation email" },
  { kind: "Action", label: "Send WhatsApp follow-up" },
  { kind: "Action", label: "Notify the sales owner" },
  { kind: "Delay", label: "Wait 24 hours" },
  { kind: "Condition", label: "Appointment booked?" },
  { kind: "Action", label: "Send the appropriate follow-up" },
];

/* ── Section 12: templates ── */
const templateCategories = [
  "New lead follow-up",
  "Booking confirmation and reminders",
  "No-show follow-up",
  "Lead nurturing",
  "Sales reactivation",
  "Customer onboarding",
  "Review request",
  "Promotional campaign",
];

/* ── Section 13: integrations ── */
const integrationGroups: {
  group: string;
  items: { name: string; icon: typeof Users; status: StatusLabel }[];
}[] = [
  {
    group: "Communication",
    items: [
      { name: "Meta WhatsApp Cloud API", icon: MessageSquare, status: "Available" },
      { name: "Twilio (SMS and WhatsApp)", icon: PhoneCall, status: "Available" },
      { name: "Resend", icon: Mail, status: "Available" },
      { name: "SendGrid", icon: Send, status: "Beta" },
    ],
  },
  {
    group: "Payments",
    items: [
      { name: "Stripe", icon: CreditCard, status: "Available" },
      { name: "PayPal", icon: CreditCard, status: "Coming Soon" },
    ],
  },
  {
    group: "AI agents",
    items: [
      { name: "MCP-compatible clients", icon: Plug, status: "Beta" },
    ],
  },
  {
    group: "Advertising",
    items: [
      { name: "Meta Ads (lead ads)", icon: Megaphone, status: "Beta" },
      { name: "Google Ads", icon: MousePointerClick, status: "Coming Soon" },
    ],
  },
  {
    group: "Automation",
    items: [
      { name: "Webhooks", icon: Zap, status: "Available" },
      { name: "Zapier", icon: Layers, status: "Coming Soon" },
      { name: "Make", icon: Layers, status: "Coming Soon" },
    ],
  },
  {
    group: "Productivity",
    items: [
      { name: "Google Calendar", icon: CalendarCheck, status: "Beta" },
      { name: "Google Sheets", icon: Table2, status: "Coming Soon" },
      { name: "Slack", icon: Slack, status: "Coming Soon" },
    ],
  },
];

/* ── Section 14: use cases ── */
const useCases = [
  { title: "Coaches and Consultants", desc: "Capture enquiries, qualify prospects and turn interest into booked discovery calls.", target: "bookings", icon: UserPlus },
  { title: "Creators", desc: "Build lead funnels, promote digital offers and nurture audiences automatically.", target: "lead-capture", icon: LayoutTemplate },
  { title: "Agencies", desc: "Manage campaigns, client pipelines and multichannel follow-up from one system.", target: "messaging", icon: Layers },
  { title: "SMEs and Local Businesses", desc: "Respond to enquiries faster, reduce missed follow-up and manage appointments.", target: "automations", icon: Users },
];

/* ── Section 16: FAQ ── */
const faqs: { q: string; a: string; node?: React.ReactNode }[] = [
  { q: "What is NexusFlo24?", a: "NexusFlo24 is an AI-powered sales and marketing platform that combines CRM, funnels, email, WhatsApp and SMS messaging, automations, bookings and analytics in one connected system." },
  { q: "Who is NexusFlo24 built for?", a: "Coaches and consultants, creators, agencies, SMEs and local businesses, and busy professionals running service-based businesses." },
  { q: "Can I manage email, WhatsApp and SMS from NexusFlo24?", a: "Yes. You can send individual messages and bulk campaigns over email, WhatsApp (Meta Cloud API or Twilio) and SMS, with message history linked to the relevant CRM record." },
  { q: "Do I need coding experience?", a: "No. Funnels, forms, booking pages and automations are built with visual editors. Developer options such as webhooks and the MCP endpoint are optional." },
  { q: "Can NexusFlo24 automate appointment reminders?", a: "Yes. Booking pages can send confirmations and reminders by email, WhatsApp and SMS, and automations can handle rescheduling and no-show follow-up." },
  { q: "Can I connect my existing tools?", a: "You can connect supported messaging, payment and calendar providers, plus webhooks for custom integrations. Each integration on this page is labelled Available, Beta or Coming Soon." },
  { q: "What is the NexusFlo24 MCP connection?", a: "MCP lets compatible AI assistants connect securely to your workspace through an OAuth-protected endpoint. You approve which tool areas an agent can use, actions are recorded in an activity log, and access can be revoked at any time." },
  { q: "How does NexusFlo24 protect business data?", a: "Workspaces are isolated with row-level access rules, sign-in is handled by a managed authentication provider, provider credentials are stored encrypted, integration access is permission-based and MCP activity is logged." },
  { q: "Can I start with a free trial?", a: "Yes. The Starter plan includes a 14-day free trial so you can set up your first funnel, automation and booking page before committing." },
  { q: "Where can I view pricing?", a: "Full plan details and credit packs are on the pricing page.", node: (<>Full plan details and credit packs are on the <Link to="/pricing" className="font-medium text-accent underline underline-offset-4">pricing page</Link>.</>) },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
};

const Features = () => {
  const track = useCallback((event: string, params?: Record<string, unknown>) => {
    fbqTrackCustom(event, params);
  }, []);

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NexusFlo24",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered sales and marketing automation platform with CRM, WhatsApp, email and SMS messaging, funnels, bookings and analytics.",
    url: "https://nexusflo24.com/features",
    offers: { "@type": "Offer", category: "SaaS", url: "https://nexusflo24.com/pricing" },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <Layout>
      <Seo
        title="NexusFlo24 Features | AI CRM and Marketing Automation"
        description="Explore NexusFlo24 CRM, WhatsApp, email and SMS automation, funnels, bookings, AI assistants, analytics and connected sales workflows."
        path="/features"
        jsonLd={softwareLd}
      />
      <Seo
        title="NexusFlo24 Features | AI CRM and Marketing Automation"
        description="Explore NexusFlo24 CRM, WhatsApp, email and SMS automation, funnels, bookings, AI assistants, analytics and connected sales workflows."
        path="/features"
        jsonLd={faqLd}
      />

      {/* ══ 1. HERO ══ */}
      <section className="bg-hero py-16 md:py-24">
        <div className="container max-w-[1280px]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Badge className="mb-6 border-accent/30 bg-navy-light/60 text-accent hover:bg-navy-light/80">
                <Zap className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                All-in-One AI Sales and Marketing Platform
              </Badge>
              <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-primary-foreground md:text-5xl">
                Capture Leads. Follow Up Automatically. Convert More Customers.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
                NexusFlo24 brings CRM, WhatsApp, email, SMS, funnels, bookings and AI
                automation into one connected sales system—so every lead receives the
                right next action.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/register" onClick={() => track("features_primary_cta_click", { location: "hero" })}>
                  <Button size="lg" className="w-full bg-accent px-8 text-base text-accent-foreground shadow-gold hover:bg-gold-dark sm:w-auto">
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link to={DEMO_PATH} onClick={() => track("features_demo_click", { location: "hero" })}>
                  <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 bg-navy-lighter px-8 text-base text-primary-foreground hover:bg-navy-light sm:w-auto">
                    Book a Demo
                  </Button>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => scrollTo("how-it-works")}
                className="mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary-foreground/70 underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Explore the platform <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="relative">
              <img
                src={heroDashboard}
                alt="NexusFlo24 dashboard showing lead activity, campaign performance and pipeline overview"
                className="w-full rounded-2xl border border-primary-foreground/10 shadow-card-hover"
                width={1200}
                height={800}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 2. CAPABILITY STRIP ══ */}
      <section aria-label="Platform capabilities" className="border-b border-border bg-background py-5">
        <div className="container max-w-[1280px]">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto md:flex-wrap md:justify-center">
            {capabilities.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium"
              >
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══ 3. HOW IT WORKS ══ */}
      <section id="how-it-works" className="scroll-mt-32 bg-background py-16 md:py-24">
        <div className="container max-w-[1280px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              One connected journey from new lead to customer
            </h2>
            <p className="mt-4 text-muted-foreground">
              Instead of piecing together separate tools, NexusFlo24 connects your lead
              capture, conversations, follow-ups, bookings and reporting.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {journey.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <step.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground/60">{step.n}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4. STICKY NAV ══ */}
      <StickyFeatureNav
        items={navItems}
        onSelect={(id) => track("features_category_select", { category: id })}
      />

      {/* ══ 5. LEAD CAPTURE ══ */}
      <FeatureSection
        id="lead-capture"
        tone="muted"
        eyebrow="Lead Capture and Funnels"
        heading="Turn visitor interest into organised sales opportunities"
        description="Create landing pages, forms and lead-capture journeys that send every new enquiry directly into your NexusFlo24 CRM."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <CapabilityList
            items={[
              "Landing-page and funnel builder",
              "Lead-capture forms",
              "Mobile-responsive pages",
              "Custom domains",
              "Thank-you pages",
              "Lead-source tracking",
              "AI chatbot lead capture",
              "Automatic CRM contact creation",
            ]}
          />
          <Reveal>
            <MockPanel title="Funnel builder" icon={LayoutTemplate}>
              <div className="space-y-3">
                {[
                  { step: "Landing page", meta: "Headline, form, testimonial" },
                  { step: "Lead form", meta: "Name, email, phone, consent" },
                  { step: "Thank-you page", meta: "Booking link + next steps" },
                ].map((b) => (
                  <div key={b.step} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{b.step}</p>
                      <p className="text-xs text-muted-foreground">{b.meta}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Published</span>
                  </div>
                ))}
              </div>
            </MockPanel>
          </Reveal>
        </div>
      </FeatureSection>

      {/* ══ 6. CRM ══ */}
      <FeatureSection
        id="crm"
        eyebrow="CRM and Pipeline"
        heading="Every lead, conversation and next action in one place"
        description="Manage contacts, opportunities and follow-up activity without searching through disconnected spreadsheets, inboxes and messaging tools."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <MockPanel title="Sales pipeline" icon={Users}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { stage: "New", cards: ["A. Bennett", "R. Okafor"] },
                  { stage: "Qualified", cards: ["S. Mensah"] },
                  { stage: "Booked", cards: ["J. Lawal", "K. Adeyemi"] },
                ].map((col) => (
                  <div key={col.stage} className="rounded-xl border border-border bg-surface p-2.5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{col.stage}</p>
                    <div className="space-y-2">
                      {col.cards.map((c) => (
                        <div key={c} className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium">{c}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </MockPanel>
          </Reveal>
          <CapabilityList
            items={[
              "Central contact records",
              "Complete contact activity timeline",
              "Lead scoring and qualification",
              "Custom CRM pipeline stages",
              "Drag-and-drop opportunity management",
              "Tasks, notes and follow-up reminders",
              "Tags, segments and custom fields",
              "Sales ownership and lead assignment",
            ]}
          />
        </div>
      </FeatureSection>

      {/* ══ 7. MESSAGING ══ */}
      <FeatureSection
        id="messaging"
        tone="muted"
        eyebrow="Unified Conversations"
        heading="Manage email, WhatsApp and SMS without losing the conversation"
        description="Create campaigns, send individual messages and keep customer communication connected to the relevant CRM record."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <CapabilityList
            items={[
              "Email communication",
              "Meta WhatsApp Cloud API messaging",
              "WhatsApp-approved template management",
              "SMS communication",
              "Bulk campaigns",
              "Personalised message variables",
              "Communication history",
              "Delivery and campaign status",
              "Unified inbox where currently supported",
            ]}
          />
          <Reveal>
            <MockPanel title="Conversation timeline" icon={MessageSquare}>
              <div className="space-y-3">
                {[
                  { ch: "Email", txt: "Thanks for your enquiry — here is what happens next.", st: "Delivered" },
                  { ch: "WhatsApp", txt: "Hi Sara, would Thursday at 10:00 work for a quick call?", st: "Read" },
                  { ch: "SMS", txt: "Reminder: your call is tomorrow at 10:00.", st: "Sent" },
                ].map((m) => (
                  <div key={m.ch} className="rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">{m.ch}</span>
                      <span className="text-[11px] text-muted-foreground">{m.st}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/90">{m.txt}</p>
                  </div>
                ))}
              </div>
            </MockPanel>
          </Reveal>
        </div>
      </FeatureSection>

      {/* ══ 8. AUTOMATIONS ══ */}
      <FeatureSection
        id="automations"
        eyebrow="Workflow Automation"
        heading="Build follow-up systems that keep working after you log off"
        description="Use triggers, conditions, delays and actions to automate repetitive sales and customer-journey tasks."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <MockPanel title="Automation builder" icon={Workflow}>
              <ol className="space-y-2">
                {workflowSteps.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.kind}
                    </span>
                    <span className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      {s.label}
                    </span>
                    {i < workflowSteps.length - 1 && <span className="sr-only">then</span>}
                  </li>
                ))}
              </ol>
            </MockPanel>
          </Reveal>
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Trigger</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Condition</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">Action</span>
            </div>
            <CapabilityList
              items={[
                "Visual workflow builder",
                "Trigger, condition and action structure",
                "Time delays and scheduled steps",
                "Email, WhatsApp and SMS actions",
                "CRM updates",
                "Team notifications",
                "Lead-assignment actions",
                "Reusable workflow templates",
              ]}
            />
          </div>
        </div>
      </FeatureSection>

      {/* ══ 9. BOOKINGS ══ */}
      <FeatureSection
        id="bookings"
        tone="muted"
        eyebrow="Bookings"
        heading="Turn qualified interest into booked conversations"
        description="Create booking pages and automate confirmations, reminders, rescheduling and no-show follow-up."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <CapabilityList
            items={[
              "Branded booking pages",
              "Calendar availability",
              "Booking confirmation",
              "Email, WhatsApp and SMS reminders",
              "Rescheduling links",
              "No-show automation",
              "CRM activity updates",
              "Booking-source tracking",
            ]}
          />
          <Reveal>
            <MockPanel title="30-minute discovery call" icon={CalendarCheck}>
              <div className="grid gap-2 sm:grid-cols-3">
                {["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"].map((t) => (
                  <div key={t} className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm font-medium">{t}</div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Confirmation and reminders sent by email, WhatsApp and SMS.
              </div>
            </MockPanel>
          </Reveal>
        </div>
      </FeatureSection>

      {/* ══ 10. AI + MCP ══ */}
      <FeatureSection
        id="ai-mcp"
        eyebrow="Nexus AI and Connected Agents"
        heading="Manage more of your business through conversation"
        description="Nexus AI helps users create content, understand their data and take action faster. MCP connectivity allows compatible AI agents to interact securely with approved NexusFlo24 tools and business data."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <CapabilityList
            items={[
              "Nexus AI platform assistant",
              "AI copy and follow-up generation",
              "AI campaign assistance",
              "AI lead-response support",
              "AI chatbot",
              "MCP server connection",
              "Tool-level permissions",
              "Revocable access",
              "Activity and audit visibility",
            ]}
          />
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                How an agent connection works
              </h3>
              <ol className="mt-4 space-y-3">
                {[
                  { icon: Plug, t: "Connect agent" },
                  { icon: KeyRound, t: "Approve permissions" },
                  { icon: Bot, t: "Ask naturally" },
                  { icon: Zap, t: "NexusFlo24 performs the approved action" },
                ].map((s, i) => (
                  <li key={s.t} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <s.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">{i + 1}. {s.t}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 space-y-2 text-sm">
                <p className="font-medium">Agent actions today</p>
                <div className="flex flex-wrap gap-2">
                  {["Read leads", "Read campaigns", "Read bookings", "Read conversations", "Workspace summary"].map((t) => (
                    <span key={t} className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs">{t}</span>
                  ))}
                  {["Create and update records", "Send messages"].map((t) => (
                    <span key={t} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {t} — Coming Soon
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </FeatureSection>

      {/* ══ 11. ANALYTICS ══ */}
      <FeatureSection
        id="analytics"
        tone="muted"
        eyebrow="Analytics and Reporting"
        heading="See what is generating leads, conversations and revenue"
        description="Track where enquiries come from, how campaigns perform and how opportunities move through your pipeline."
      >
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
          <CapabilityList
            items={[
              "Lead-source reporting",
              "Funnel performance",
              "Campaign results",
              "Message delivery reporting",
              "Appointment reporting",
              "Pipeline performance",
              "Conversion tracking",
              "Date and campaign filters",
            ]}
          />
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Calculator className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">ROI Savings Calculator</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Estimate the tool costs and manual follow-up time you could consolidate
                    by running your sales system in one place.
                  </p>
                </div>
              </div>
              <Link
                to="/tools/roi-savings-calculator"
                onClick={() => track("features_roi_calculator_click")}
                className="mt-5 inline-block"
              >
                <Button variant="outline">
                  Open the calculator <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </FeatureSection>

      {/* ══ 12. TEMPLATES ══ */}
      <FeatureSection
        id="templates"
        heading="Start with a proven workflow instead of a blank screen"
        eyebrow="Templates"
        description="Import a ready-made automation, adjust the copy and timing, and switch it on."
      >
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templateCategories.map((t, i) => (
            <Reveal key={t} delay={i * 50}>
              <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-sm font-medium">{t}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Button className="mt-8" onClick={() => scrollTo("final-cta")}>
          Explore Templates <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </FeatureSection>

      {/* ══ 13. INTEGRATIONS ══ */}
      <FeatureSection
        id="integrations"
        tone="muted"
        eyebrow="Integrations"
        heading="Connect NexusFlo24 to the tools you already use"
        description="Each integration below is labelled with its current status so you always know what is live."
      >
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrationGroups.map((g) => (
            <Reveal key={g.group}>
              <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </h3>
                <ul className="space-y-2.5">
                  {g.items.map((it) => (
                    <li key={it.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm">
                        <it.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                        {it.name}
                      </span>
                      <StatusBadge status={it.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </FeatureSection>

      {/* ══ 14. USE CASES ══ */}
      <section className="bg-background py-16 md:py-24">
        <div className="container max-w-[1280px]">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            Built for the way growing businesses sell
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u, i) => (
              <Reveal key={u.title} delay={i * 70}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <u.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{u.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
                  <button
                    type="button"
                    onClick={() => scrollTo(u.target)}
                    className="mt-4 inline-flex items-center gap-1.5 self-start rounded-md text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    See how it works <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 15. SECURITY ══ */}
      <section className="bg-surface py-16 md:py-24">
        <div className="container max-w-[1280px]">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Security and Control
            </p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              Your business data stays under your control
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Lock, t: "Secure authentication", d: "Sign-in and sessions are handled by a managed authentication provider with inactivity timeouts." },
              { icon: ShieldCheck, t: "Role-based access", d: "Workspace roles control who can view and change leads, campaigns and settings." },
              { icon: KeyRound, t: "Permission-based integrations", d: "Provider credentials are stored encrypted and scoped to your workspace." },
              { icon: Eye, t: "Audit visibility", d: "MCP agent activity and workspace actions are recorded so you can review them." },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 60}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card">
                  <s.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              { to: "/security", label: "Security overview" },
              { to: "/privacy-policy", label: "Privacy Policy" },
              { to: "/data-processing-addendum", label: "Data Processing Addendum" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 16. FAQ ══ */}
      <section className="bg-background py-16 md:py-24">
        <div className="container max-w-3xl">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Frequently asked questions
          </h2>
          <Accordion
            type="single"
            collapsible
            className="mt-10 w-full"
            onValueChange={(v) => v && track("features_faq_expand", { question: v })}
          >
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {f.node ?? f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ══ 17. FINAL CTA ══ */}
      <section id="final-cta" className="scroll-mt-32 bg-hero py-16 md:py-24">
        <div className="container max-w-[1280px] text-center">
          <h2 className="mx-auto max-w-3xl text-2xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            Ready to build a sales system that follows up for you?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/80">
            Capture leads, manage conversations, automate follow-up and turn more
            opportunities into booked customers with NexusFlo24.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" onClick={() => track("features_final_cta_click", { cta: "trial" })}>
              <Button size="lg" className="bg-accent px-8 text-base text-accent-foreground shadow-gold hover:bg-gold-dark">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link to={DEMO_PATH} onClick={() => track("features_final_cta_click", { cta: "demo" })}>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-navy-lighter px-8 text-base text-primary-foreground hover:bg-navy-light">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Features;
