import Layout from "@/components/layout/Layout";
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
import stepCapture from "@/assets/step-capture.png";
import stepNurture from "@/assets/step-nurture.png";
import stepConvert from "@/assets/step-convert.png";
import { useState } from "react";
import { toast } from "sonner";


const features = [
  { icon: Brain, title: "AI Lead Gen Engine", desc: "Capture and score leads automatically with AI-powered forms and landing pages.", slug: "ai-lead-gen" },
  { icon: Users, title: "Smart CRM", desc: "Manage contacts, track interactions, and close deals with intelligent insights.", slug: "smart-crm" },
  { icon: Mail, title: "AI Email & WhatsApp", desc: "Send personalized campaigns across email and WhatsApp with AI-written copy.", slug: "email-whatsapp" },
  { icon: MessageSquare, title: "Bulk SMS", desc: "Reach thousands instantly with targeted SMS campaigns and auto-replies.", slug: "bulk-sms" },
  { icon: Workflow, title: "Nurture Flow Builder", desc: "Drag-and-drop automation workflows that convert leads on autopilot.", slug: "nurture-flow" },
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
  { name: "Google", logo: "https://cdn.simpleicons.org/google" },
  { name: "Zapier", logo: "https://cdn.simpleicons.org/zapier" },
  { name: "Make", logo: "https://cdn.simpleicons.org/make" },
  { name: "Meta", logo: "https://cdn.simpleicons.org/meta" },
  { name: "Stripe", logo: "https://cdn.simpleicons.org/stripe" },
  { name: "PayPal", logo: "https://cdn.simpleicons.org/paypal" },
  { name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot" },
  { name: "Mailchimp", logo: "https://cdn.simpleicons.org/mailchimp" },
  { name: "Shopify", logo: "https://cdn.simpleicons.org/shopify" },
  { name: "WordPress", logo: "https://cdn.simpleicons.org/wordpress" },
  { name: "Salesforce", logo: "https://cdn.simpleicons.org/salesforce" },
  { name: "Calendly", logo: "https://cdn.simpleicons.org/calendly" },
  { name: "Notion", logo: "https://cdn.simpleicons.org/notion" },
  { name: "Typeform", logo: "https://cdn.simpleicons.org/typeform" },
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
    {/* Hero */}
    <section className="relative overflow-hidden min-h-[600px] md:min-h-[700px]">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroTeam}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
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
          <Link to="/contact?subject=demo">
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
    <section className="border-b bg-surface py-8">
      <div className="container">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by teams using industry-leading tools
        </p>
        <div className="overflow-hidden">
          <div className="flex animate-marquee hover:[animation-play-state:paused] w-max gap-6 items-center">
            {[...integrations, ...integrations].map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex-shrink-0 w-28 h-16 flex items-center justify-center rounded-xl border border-border bg-card shadow-sm"
              >
                <img
                  src={item.logo}
                  alt={item.name}
                  className="h-7 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
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
              className="group [perspective:1000px]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative h-[280px] w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 rounded-xl border bg-card p-6 shadow-card [backface-visibility:hidden] flex flex-col">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <f.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1">{f.desc}</p>
                  <span className="mt-3 text-xs text-muted-foreground/60">Hover to explore →</span>
                </div>
                {/* Back */}
                <div className="absolute inset-0 rounded-xl border bg-primary p-6 shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                    <f.icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-primary-foreground">{f.title}</h3>
                  <p className="text-sm text-primary-foreground/70 mb-4">{f.desc}</p>
                  <Link to={`/features#${f.slug}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-gold-dark transition-colors">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
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
          <div className="group relative rounded-xl border bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow duration-500 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            {/* Glow effect on hover */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl -z-10" />
            <div className="overflow-hidden rounded-lg">
              <img
                src={heroDashboard}
                alt="NexusFlo24 dashboard demo preview"
                className="rounded-lg transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            {/* Overlay CTA on hover */}
            <div className="absolute inset-4 rounded-lg bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
              <span className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-gold scale-90 group-hover:scale-100 transition-transform duration-500">
                Explore Live Demo <ArrowRight className="h-4 w-4" />
              </span>
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
