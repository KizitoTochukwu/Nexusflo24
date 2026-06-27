import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TypewriterText from "@/components/TypewriterText";
import {
  Brain, Users, Mail, MessageSquare, Workflow, LayoutTemplate,
  PenTool, BarChart3, ArrowRight, Star, CheckCircle, Zap, Target, TrendingUp
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroDashboard from "@/assets/hero-dashboard.png";
import heroTeam from "@/assets/hero-team.jpg";
import stepCapture from "@/assets/step-capture.jpg";
import stepNurture from "@/assets/step-nurture.jpg";
import stepConvert from "@/assets/step-convert.jpg";
import { useState } from "react";
import { toast } from "sonner";
import MotionShowcaseSection from "@/components/home/MotionShowcaseSection";
import ExitIntentPopup from "@/components/home/ExitIntentPopup";
import logoMonday from "@/assets/logos/monday.png.asset.json";
import logoZapier from "@/assets/logos/zapier.png.asset.json";
import logoHubspot from "@/assets/logos/hubspot.png.asset.json";
import logoMailchimp from "@/assets/logos/mailchimp.png.asset.json";
import logoCalendly from "@/assets/logos/calendly.png.asset.json";
import logoStripe from "@/assets/logos/stripe.png.asset.json";
import logoMeta from "@/assets/logos/meta.png.asset.json";
import logoShopify from "@/assets/logos/shopify.png.asset.json";
import logoGmail from "@/assets/logos/gmail.png.asset.json";
import logoWordpress from "@/assets/logos/wordpress.png.asset.json";
import logoSalesforce from "@/assets/logos/salesforce.png.asset.json";


const features = [
  { icon: Brain, title: "AI Lead Gen Engine", desc: "Capture and score leads automatically with AI-powered forms and landing pages.", slug: "ai-lead-gen" },
  { icon: Users, title: "Smart CRM", desc: "Manage contacts, track interactions, and close deals with intelligent insights.", slug: "smart-crm" },
  { icon: Mail, title: "AI Email & WhatsApp", desc: "Send personalized campaigns across email and WhatsApp with AI-written copy.", slug: "email-whatsapp" },
  { icon: MessageSquare, title: "Bulk SMS", desc: "Reach thousands instantly with targeted SMS campaigns and auto-replies.", slug: "bulk-sms" },
  { icon: Workflow, title: "Workflow Builder", desc: "Drag-and-drop automation workflows that convert leads on autopilot.", slug: "nurture-flow" },
  { icon: LayoutTemplate, title: "Funnel & Page Builder", desc: "Build high-converting funnels and landing pages in minutes — no code needed.", slug: "funnel-builder" },
  { icon: PenTool, title: "AI Copywriter", desc: "Generate compelling subject lines, ad copy, and follow-ups with AI.", slug: "ai-copywriter" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "See what's converting with real-time analytics and AI-powered insights.", slug: "analytics" },
];

const steps = [
  { icon: Target, title: "Capture", desc: "AI-powered forms, landing pages, and chatbots capture leads 24/7.", num: "01", slug: "capture", image: stepCapture },
  { icon: Workflow, title: "Nurture", desc: "Automated email, WhatsApp, and SMS flows keep leads engaged.", num: "02", slug: "nurture", image: stepNurture },
  { icon: TrendingUp, title: "Convert", desc: "AI scores leads and notifies your team when they're ready to buy.", num: "03", slug: "convert", image: stepConvert },
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

const integrations = [
  { name: "Monday.com", logo: logoMonday.url },
  { name: "Zapier", logo: logoZapier.url },
  { name: "HubSpot", logo: logoHubspot.url },
  { name: "Mailchimp", logo: logoMailchimp.url },
  { name: "Calendly", logo: logoCalendly.url },
  { name: "Stripe", logo: logoStripe.url },
  { name: "Meta", logo: logoMeta.url },
  { name: "Shopify", logo: logoShopify.url },
  { name: "Gmail", logo: logoGmail.url },
  { name: "WordPress", logo: logoWordpress.url },
  { name: "Salesforce", logo: logoSalesforce.url },
];

const Index = () => {
  const [heroEmail, setHeroEmail] = useState("");
  const navigate = useNavigate();

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroEmail || !/\S+@\S+\.\S+/.test(heroEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    navigate(`/register?email=${encodeURIComponent(heroEmail)}`);
  };

  return (
  <Layout>
    <Seo
      title="NexusFlo24 – AI Sales & Marketing Automation Platform"
      description="Turn website visitors into paying customers automatically using AI-powered funnels, CRM, email and WhatsApp automation — no tech skills needed."
      path="/"
      jsonLd={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "NexusFlo24",
            url: "https://nexusflo24.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://nexusflo24.com/blog?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ],
      }}
    />
    {/* Hero */}
    <section className="relative overflow-hidden min-h-[600px] md:min-h-[700px]">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroTeam}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/50 to-navy/80" />
      </div>

      {/* Content */}
      <div className="container relative z-10 flex flex-col items-center justify-center py-24 md:py-36 text-center">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl max-w-4xl">
          <TypewriterText
            speed={40}
            segments={[
              { text: "Automate Your " },
              { text: "Sales & Marketing", className: "text-accent" },
              { text: "", isBreak: true },
              { text: "With " },
              { text: "AI-Powered", className: "text-accent" },
              { text: " Precision" },
            ]}
          />
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-primary-foreground/70 animate-fade-up">
          Drive Leads, Engage Customers, and Grow Revenue — All From One Intelligent Platform.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-up">
          <Link to="/register">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold text-base px-10 py-6 text-lg rounded-lg">
              Get Started Free
            </Button>
          </Link>
          <Link to="/book/30-minute-discovery-call-9f5d5f">
            <Button size="lg" variant="outline" className="border-primary-foreground/40 bg-background/90 text-foreground hover:bg-background text-base px-10 py-6 text-lg rounded-lg">
              Get a Demo
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-16 inline-flex flex-wrap items-center justify-center gap-1 rounded-full bg-background/90 px-6 py-3 shadow-lg animate-fade-up">
          <div className="flex items-center gap-2 px-4 py-1">
            <CheckCircle className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-foreground">Increased Sales</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 px-4 py-1">
            <Workflow className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-foreground">Automated Marketing</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 px-4 py-1">
            <Brain className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-foreground">AI-Powered CRM</span>
          </div>
        </div>
      </div>
    </section>

    {/* Social proof */}
    <section className="relative border-y border-border/60 bg-gradient-to-b from-white via-surface to-white py-8">
      <div className="container">
        <div className="mx-auto mb-5 max-w-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">Trusted Integrations</span>
          <p className="mt-1.5 text-xs font-medium tracking-wide text-muted-foreground">
            Powering teams alongside industry-leading tools
          </p>
        </div>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="flex w-max animate-marquee items-center gap-5 hover:[animation-play-state:paused]">
            {[...integrations, ...integrations].map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="group flex h-14 w-28 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card px-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
              >
                <img
                  src={item.logo}
                  alt={`${item.name} logo`}
                  className="max-h-7 w-auto object-contain opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>


    {/* Features */}
    <section className="py-20 bg-white md:py-28" id="features">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Features</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Everything You Need to Grow</h2>
          <p className="mt-4 text-muted-foreground">
            One platform for lead generation, nurturing, and conversion. Powered by AI.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative flex flex-col items-center text-center rounded-xl border border-accent/15 bg-primary p-8 transition-all duration-500 hover:-translate-y-2 hover:border-accent/50 hover:shadow-[0_20px_40px_-15px_rgba(11,31,59,0.35)]"
            >
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 text-accent transition-colors duration-500 group-hover:bg-accent group-hover:text-primary">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-4 text-xl font-semibold tracking-tight text-white">{f.title}</h3>
              <p className="mb-8 flex-grow text-sm leading-relaxed text-slate-400">{f.desc}</p>
              <Link
                to={`/features#${f.slug}`}
                className="inline-flex items-center rounded-full bg-accent px-6 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-all duration-300 hover:scale-105 hover:bg-white"
              >
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>

    <MotionShowcaseSection />

    {/* Why We Created NexusFlo24 */}
    <section className="py-20 md:py-28 bg-surface">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Our Story</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Why We Created NexusFlo24</h2>
          <p className="mt-4 text-muted-foreground">
            Hear directly from our team about the mission behind the platform.
          </p>
        </div>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl shadow-card">
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/814S7T-Kcqw?si=c65o6TQcWfseAFAU"
              title="Why We Created NexusFlo24"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
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
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="group relative rounded-xl border border-primary/30 bg-primary overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 animate-fade-up"
              style={{ animationDelay: `${i * 200}ms`, animationFillMode: "backwards" }}
            >
              {/* Image */}
              <div className="h-48 overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                />
              </div>
              {/* Content */}
              <div className="p-8 text-center">
                <span className="mb-4 block text-5xl font-extrabold text-accent/20 group-hover:text-accent/40 transition-colors duration-500">{s.num}</span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-500">
                  <s.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-primary-foreground">{s.title}</h3>
                <p className="text-sm text-primary-foreground/70">{s.desc}</p>
                <Link to={`/how-it-works/${s.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-gold-dark transition-colors group-hover:gap-2">
                  Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Demo */}
    <section className="relative overflow-hidden bg-[#f0f4f8] py-24 md:py-32">
      {/* Ambient accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="container relative">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">
                <span className="h-px w-8 bg-accent/60" />
                See It In Action
              </span>
              <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary md:text-5xl">
                Your Marketing<br className="hidden md:block" /> Command Center
              </h2>
              <p className="max-w-md text-base text-slate-600">
                Every lead, message, and campaign — orchestrated from one beautifully simple dashboard.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                "Launch a nurture flow in minutes",
                "AI writes your follow-ups",
                "See what's converting in real-time",
                "Multi-channel: Email + WhatsApp + SMS",
                "Score and route leads automatically",
              ].map((item) => (
                <li key={item} className="flex items-center gap-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_4px_12px_-2px_rgba(201,162,39,0.5)]">
                    <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <span className="text-base font-medium text-slate-700 md:text-lg">{item}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Link to="/dashboard" className="inline-flex">
                <Button className="group h-auto rounded-xl bg-accent px-8 py-4 text-base font-semibold text-accent-foreground shadow-[0_10px_24px_-6px_rgba(201,162,39,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-dark hover:shadow-[0_14px_30px_-6px_rgba(201,162,39,0.6)]">
                  Explore Demo Dashboard
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Dashboard preview */}
          <div
            className="group relative cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            {/* Outer glow */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-accent/20 via-white/0 to-primary/20 opacity-60 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />

            {/* Frame */}
            <div className="relative rounded-3xl border border-white bg-white/80 p-2 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-sm transition-transform duration-500 group-hover:-translate-y-1">
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200/60">
                <img
                  src={heroDashboard}
                  alt="NexusFlo24 dashboard demo preview"
                  className="block w-full transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>

              {/* Floating growth badge */}
              <div className="absolute -top-5 -right-5 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 pr-4 shadow-xl md:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Growth</p>
                  <p className="text-lg font-extrabold text-primary">+28.5%</p>
                </div>
              </div>

              {/* Floating leads badge */}
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl bg-primary p-3 pr-4 shadow-2xl md:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-accent">
                  <Users className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Active Leads</p>
                  <p className="text-lg font-extrabold text-white">12,847</p>
                </div>
              </div>

              {/* Hover CTA overlay */}
              <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl bg-primary/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <span className="flex scale-90 items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-gold transition-transform duration-500 group-hover:scale-100">
                  Explore Live Demo <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

            </div>
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
            <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="mb-3 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-accent/10 px-3 py-1 text-center text-xs font-semibold text-accent">
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
          <Link to="/book/30-minute-discovery-call-9f5d5f">
            <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-white hover:bg-primary hover:text-primary-foreground text-base px-8">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
    <ExitIntentPopup />
  </Layout>
  );
};

export default Index;
