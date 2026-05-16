import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Lightbulb,
  Heart,
  Target,
  Users,
  Zap,
  Eye,
  Rocket,
  Globe,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Quote,
  CheckCircle2,
} from "lucide-react";

const values = [
  { icon: Lightbulb, title: "Innovation First", desc: "We push the boundaries of what AI can do for marketing." },
  { icon: Heart, title: "Customer Obsessed", desc: "Every feature starts with a customer problem to solve." },
  { icon: Target, title: "Results Driven", desc: "We measure success by the growth our customers achieve." },
  { icon: Users, title: "Inclusive Growth", desc: "Enterprise-grade tools accessible to businesses of every size." },
];

const timeline = [
  { year: "2022", event: "Founded with a mission to democratize AI marketing." },
  { year: "2023", event: "Launched beta with 500 early adopters. Raised seed funding." },
  { year: "2024", event: "10,000+ active users. WhatsApp & SMS channels launched." },
  { year: "2025", event: "Agency platform, white-label, and advanced AI features." },
  { year: "2026", event: "AI Sales Closer, smart funnels, and global expansion." },
];

const stats = [
  { icon: Users, stat: "10,000+", label: "Active Users" },
  { icon: Globe, stat: "40+", label: "Countries Served" },
  { icon: MessageSquare, stat: "2M+", label: "Messages Automated" },
  { icon: BarChart3, stat: "35%", label: "Avg. Conversion Lift" },
];

const culture = [
  { icon: TrendingUp, title: "Growth-First Culture", desc: "We ship fast, learn faster, and celebrate wins — big or small." },
  { icon: Lightbulb, title: "Radical Innovation", desc: "Every team member is empowered to challenge the status quo with bold ideas." },
  { icon: Heart, title: "People Over Process", desc: "We invest in our people — flexible work, continuous learning, and real impact." },
];

const leaders = [
  { name: "Kizito Tochukwu", role: "CEO & Co-Founder", initials: "KT", image: "/lovable-uploads/kizito-tochukwu.png" },
  { name: "Mia Thompson", role: "CTO & Co-Founder", initials: "MT", image: "/lovable-uploads/mia-thompson.jpeg" },
  { name: "James Park", role: "VP of Product", initials: "JP", image: "/lovable-uploads/james-park.jpeg" },
];

const About = () => (
  <Layout>
    <Seo
      title="About NexusFlo24 – Our Mission to Democratize AI Marketing"
      description="Learn how NexusFlo24 is making enterprise-grade AI marketing accessible to creators, entrepreneurs and small businesses worldwide."
    />

    {/* Hero */}
    <section className="relative overflow-hidden bg-hero py-24 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="container relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold backdrop-blur animate-fade-up">
          <Zap className="h-3.5 w-3.5" /> About Us
        </span>
        <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-primary-foreground md:text-6xl animate-fade-up animation-delay-200">
          Simplifying AI Marketing <span className="text-gradient-gold">for Every Business</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/70 animate-fade-up animation-delay-400">
          We believe every business deserves the power of AI-driven marketing automation — not just the big players.
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-primary-foreground/60 animate-fade-up animation-delay-600">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> 10,000+ active users</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> 40+ countries served</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> GDPR-ready</span>
        </div>
      </div>
    </section>

    {/* Vision & Mission */}
    <section className="bg-background py-20">
      <div className="container">
        <h2 className="mb-3 text-center text-4xl font-bold">Our Vision &amp; Mission</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          The principles that drive everything we build.
        </p>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {[
            { icon: Eye, eyebrow: "Where we're headed", title: "Our Vision", body: "We envision a world where every business — regardless of size, budget, or technical skill — has access to the same intelligent automation that powers the world's fastest-growing companies. NexusFlo24 is building the future of growth: one where AI captures, nurtures, and converts leads around the clock, so entrepreneurs and creators can focus on what they do best." },
            { icon: Rocket, eyebrow: "What we do every day", title: "Our Mission", body: "NexusFlo24's mission is to simplify AI-powered marketing and sales automation for everyday businesses. We combine CRM, email, WhatsApp, SMS, funnels, and analytics into a single intuitive platform — helping our customers attract more leads, respond faster, and close more deals without the complexity or cost of juggling multiple tools." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl bg-gradient-to-br from-accent/40 via-border to-accent/20 p-[1px] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
              <div className="relative h-full overflow-hidden rounded-2xl bg-card p-8 md:p-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{c.eyebrow}</p>
                    <h3 className="text-2xl font-bold">{c.title}</h3>
                  </div>
                </div>
                <p className="leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="bg-surface py-20">
      <div className="container">
        <h2 className="mb-3 text-center text-4xl font-bold">Our Values</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          The non-negotiables that shape how we build and serve.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent/50"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/5 transition-all duration-500 group-hover:bg-accent/10" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-primary">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CEO Message */}
    <section className="bg-background py-20">
      <div className="container">
        <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-to-br from-accent/40 via-border to-accent/20 p-[1px] shadow-card">
          <div className="relative overflow-hidden rounded-2xl bg-card">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
            <Quote className="pointer-events-none absolute right-6 top-6 h-32 w-32 text-accent/10" />
            <div className="grid items-center md:grid-cols-5">
              <div className="flex items-center justify-center bg-surface p-8 md:col-span-2 md:p-10">
                <img
                  src="/lovable-uploads/kizito-ceo-message.png"
                  alt="Kizito Tochukwu — CEO & Co-Founder of NexusFlo24"
                  className="w-full max-w-xs rounded-2xl object-contain shadow-card-hover ring-1 ring-accent/20"
                />
              </div>
              <div className="relative border-t border-border p-8 md:col-span-3 md:border-l md:border-t-0 md:p-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  A Message from Our CEO
                </span>
                <div className="mt-5 space-y-4 leading-relaxed text-muted-foreground">
                  <p>I started NexusFlo24 because I lived the frustration firsthand — juggling five different tools just to capture a lead, send a follow-up, and track results. For most businesses, marketing automation felt like a privilege reserved for large corporations with big budgets and dedicated teams.</p>
                  <p>I believed there had to be a better way. A single platform where AI does the heavy lifting — generating copy, qualifying leads, sending the right message on the right channel at the right time — so you can focus on what matters: building relationships and closing deals.</p>
                  <p>That belief became NexusFlo24. Our mission is simple: help every business — from solo creators to growing agencies — grow smarter, respond faster, and sell more with AI. We are committed to continuous innovation, intuitive design, and delivering real, measurable results for every customer we serve.</p>
                  <p>Thank you for trusting us on your growth journey. We're just getting started.</p>
                </div>
                <div className="mt-8 border-t border-border pt-6">
                  <p className="font-bold text-foreground">Kizito Tochukwu</p>
                  <p className="text-sm text-muted-foreground">CEO &amp; Co-Founder, NexusFlo24</p>
                  <div className="mt-2 h-0.5 w-12 bg-gradient-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Stats & Culture */}
    <section className="relative overflow-hidden bg-hero py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-1/4 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[280px] w-[280px] rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="container relative">
        <h2 className="mb-3 text-center text-4xl font-bold text-primary-foreground">NexusFlo24 by the Numbers</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-primary-foreground/70">
          Our growing impact across industries and borders.
        </p>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group rounded-2xl border border-accent/20 bg-navy-light/40 p-6 text-center backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:bg-navy-light/60"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-4xl font-extrabold text-gradient-gold">{s.stat}</p>
              <p className="mt-1 text-sm text-primary-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {culture.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-accent/15 bg-navy-light/30 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/50"
            >
              <c.icon className="mb-3 h-7 w-7 text-accent" />
              <h3 className="font-semibold text-primary-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-primary-foreground/65">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Timeline */}
    <section className="bg-background py-20">
      <div className="container">
        <h2 className="mb-3 text-center text-4xl font-bold">Our Journey</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          A few of the milestones that brought us here.
        </p>
        <div className="relative mx-auto max-w-2xl">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />
          <div className="space-y-6">
            {timeline.map((t) => (
              <div key={t.year} className="relative flex gap-6">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary shadow-gold">
                  {t.year.slice(2)}
                </div>
                <div className="flex-1 rounded-xl border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-accent/40">
                  <p className="font-bold text-primary">{t.year}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Leadership */}
    <section className="bg-surface py-20">
      <div className="container text-center">
        <h2 className="mb-3 text-4xl font-bold">Leadership</h2>
        <p className="mx-auto mb-14 max-w-xl text-muted-foreground">
          The team driving NexusFlo24 forward.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {leaders.map((l) => (
            <div
              key={l.name}
              className="group rounded-2xl border bg-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent/40"
            >
              {l.image ? (
                <img
                  src={l.image}
                  alt={l.name}
                  className="mx-auto mb-5 h-24 w-24 rounded-full object-cover ring-2 ring-accent/40 ring-offset-2 ring-offset-card transition-all duration-300 group-hover:ring-accent"
                />
              ) : (
                <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold text-xl font-bold text-primary shadow-gold">
                  {l.initials}
                </div>
              )}
              <h3 className="text-lg font-bold text-primary">{l.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{l.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="relative overflow-hidden bg-hero py-20 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div className="container relative">
        <h2 className="text-4xl font-bold text-primary-foreground">Join Our Mission</h2>
        <p className="mx-auto mt-4 max-w-md text-primary-foreground/70">
          Help us make AI marketing accessible to every business.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/contact">
            <Button size="lg" className="group h-12 bg-gradient-gold px-7 text-primary shadow-gold hover:opacity-95">
              <span className="font-semibold">Get In Touch</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="h-12 border-accent/40 bg-transparent px-7 text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
              See Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
