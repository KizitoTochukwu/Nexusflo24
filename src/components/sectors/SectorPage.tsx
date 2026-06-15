import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, type LucideIcon } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface SectorContent {
  route: string;
  seo: { title: string; description: string };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    image: string;
    imageAlt: string;
  };
  trustStrip: string;
  painPoints: { icon: LucideIcon; title: string; description: string }[];
  solutions: { pain: string; solution: string }[];
  features: { icon: LucideIcon; title: string; description: string }[];
  workflow: { title: string; steps: { title: string; description: string }[] };
  testimonials: { quote: string; name: string; role: string }[];
  midCta: { headline: string; sub: string; primary: string };
  faqs: { q: string; a: string }[];
  finalCta: { headline: string; sub: string; primary: string };
}

const CtaButtons = ({ primaryLabel = "Start Free Trial" }: { primaryLabel?: string }) => (
  <div className="flex flex-col gap-3 sm:flex-row">
    <Link to="/register">
      <Button
        size="lg"
        className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold sm:w-auto"
      >
        {primaryLabel}
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </Link>
    <Link to="/book/30-minute-discovery-call-9f5d5f">
      <Button size="lg" variant="outline" className="w-full border-primary text-primary sm:w-auto">
        Book a Demo
      </Button>
    </Link>
  </div>
);

export default function SectorPage({ content }: { content: SectorContent }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title={content.seo.title}
        description={content.seo.description}
        path={content.route}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: content.seo.title,
          description: content.seo.description,
          provider: { "@type": "Organization", name: "NexusFlo24" },
        }}
      />
      <Header />
      <main className="flex-1 bg-background">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                {content.hero.eyebrow}
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary md:text-5xl lg:text-6xl">
                {content.hero.headline}
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                {content.hero.subheadline}
              </p>
              <CtaButtons />
              <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> 14-day free trial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> No credit card required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> Cancel anytime
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/20 to-primary/10 blur-2xl" />
              <img
                src={content.hero.image}
                alt={content.hero.imageAlt}
                width={1536}
                height={1024}
                className="relative w-full rounded-2xl border border-border/60 shadow-2xl"
              />
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-b border-border/60 bg-surface py-6">
          <div className="container">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {content.trustStrip}
            </p>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Sound familiar?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The everyday struggles holding you back from real growth.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.painPoints.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div
                    key={i}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW WE SOLVE IT */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                How NexusFlo24 solves it
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                One platform replacing the chaos
              </h2>
            </div>
            <div className="mx-auto mt-12 max-w-4xl space-y-4">
              {content.solutions.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground line-through">
                      {s.pain}
                    </p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-accent md:block" />
                  <div className="flex-1">
                    <p className="flex items-start gap-2 font-semibold text-primary">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <span>{s.solution}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Built for the way you actually work
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to capture, nurture, and convert — in one place.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                Workflow in action
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                {content.workflow.title}
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-5">
              {content.workflow.steps.map((step, i) => (
                <div key={i} className="relative">
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-full">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <h3 className="text-base font-semibold text-primary">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {i < content.workflow.steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-accent md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Trusted by people like you
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {content.testimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="mb-3 flex gap-0.5 text-accent">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s}>★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MID CTA */}
        <section className="bg-primary py-16 text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
              {content.midCta.headline}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg">
              {content.midCta.sub}
            </p>
            <div className="mt-8 flex justify-center">
              <CtaButtons primaryLabel={content.midCta.primary} />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <Accordion type="single" collapsible className="mt-10 w-full">
              {content.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold text-primary">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-3xl border border-accent/30 bg-card p-10 text-center shadow-xl md:p-14">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                {content.finalCta.headline}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                {content.finalCta.sub}
              </p>
              <div className="mt-8 flex justify-center">
                <CtaButtons primaryLabel={content.finalCta.primary} />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
