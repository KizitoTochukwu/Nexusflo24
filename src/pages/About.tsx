import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Heart, Target, Users, Zap } from "lucide-react";

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
];

const About = () => (
  <Layout>
    <section className="bg-hero py-20 text-center">
      <div className="container">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold">
          <Zap className="h-3.5 w-3.5" /> About Us
        </span>
        <h1 className="mt-4 text-4xl font-extrabold text-primary-foreground md:text-5xl">
          Simplifying AI Marketing <span className="text-gradient-gold">for Every Business</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
          We believe every business deserves the power of AI-driven marketing automation — not just the big players.
        </p>
      </div>
    </section>

    {/* Story */}
    <section className="py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Our Story</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            NexusFlo24 was born from a simple frustration: marketing automation was too complex, too expensive, and too fragmented for small businesses and creators. We set out to build the platform we wished existed — one that combines AI intelligence with human simplicity. Today, thousands of businesses use NexusFlo24 to grow smarter, not harder.
          </p>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="bg-surface py-20">
      <div className="container">
        <h2 className="mb-12 text-center text-3xl font-bold">Our Values</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-xl border bg-card p-6 text-center shadow-card">
              <v.icon className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Timeline */}
    <section className="py-20">
      <div className="container">
        <h2 className="mb-12 text-center text-3xl font-bold">Our Journey</h2>
        <div className="mx-auto max-w-2xl space-y-6">
          {timeline.map((t) => (
            <div key={t.year} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {t.year.slice(2)}
                </div>
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="pb-6">
                <p className="font-semibold">{t.year}</p>
                <p className="text-sm text-muted-foreground">{t.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Leadership */}
    <section className="bg-surface py-20">
      <div className="container text-center">
        <h2 className="mb-12 text-3xl font-bold">Leadership</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: "Kizito Tochukwu", role: "CEO & Co-Founder", initials: "KT" },
            { name: "Mia Thompson", role: "CTO & Co-Founder", initials: "MT" },
            { name: "James Park", role: "VP of Product", initials: "JP" },
          ].map((l) => (
            <div key={l.name} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {l.initials}
              </div>
              <h3 className="font-semibold">{l.name}</h3>
              <p className="text-sm text-muted-foreground">{l.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-hero py-16 text-center">
      <div className="container">
        <h2 className="text-3xl font-bold text-primary-foreground">Join Our Mission</h2>
        <p className="mx-auto mt-3 max-w-md text-primary-foreground/70">
          Help us make AI marketing accessible to every business.
        </p>
        <Link to="/contact" className="mt-6 inline-block">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
            Get In Touch <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  </Layout>
);

export default About;
