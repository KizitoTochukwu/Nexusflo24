import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  PhoneCall,
  Bot,
  CalendarCheck,
  UserPlus,
  FileText,
  ShieldCheck,
  Clock,
  Voicemail,
  PhoneOff,
  Mic,
  type LucideIcon,
} from "lucide-react";
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
import heroImg from "@/assets/voice-receptionist-hero.png";

const DEMO_PATH = "/book/30-minute-discovery-call-9f5d5f";

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
    <Link to={DEMO_PATH}>
      <Button size="lg" variant="outline" className="w-full border-primary text-primary sm:w-auto">
        Book a Demo
      </Button>
    </Link>
  </div>
);

const painPoints: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: PhoneOff,
    title: "Missed calls = lost revenue",
    description:
      "Every unanswered call is a potential customer who rings your competitor instead. Most businesses never know they lost the lead.",
  },
  {
    icon: Voicemail,
    title: "After-hours calls go to voicemail",
    description:
      "Callers rarely leave voicemails anymore. If nobody picks up outside office hours, the opportunity is gone by morning.",
  },
  {
    icon: FileText,
    title: "No record of what was said",
    description:
      "Reception staff juggle calls, notes, and bookings by hand. Details get lost, follow-ups slip, and nobody has the full picture.",
  },
  {
    icon: Clock,
    title: "You can't scale reception",
    description:
      "Hiring more receptionists is expensive and inflexible. One busy period and callers wait on hold — or hang up.",
  },
];

const steps = [
  {
    icon: PhoneCall,
    title: "A call comes in",
    description:
      "Your NexusFlo Voice number rings — day or night. The AI receptionist picks up instantly, every time.",
  },
  {
    icon: Bot,
    title: "It understands the caller",
    description:
      "Natural conversation, powered by realtime AI, works out what the caller needs using your own business knowledge base.",
  },
  {
    icon: CalendarCheck,
    title: "It books, transfers, or captures",
    description:
      "The assistant can book an appointment from your real availability, transfer to a human, or capture the caller's details and reason for calling.",
  },
  {
    icon: UserPlus,
    title: "It syncs to your CRM",
    description:
      "The call creates or updates a contact, logs a timeline entry, opens an opportunity, and triggers your follow-up automations — automatically.",
  },
];

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: PhoneCall,
    title: "24/7 call answering",
    description:
      "Every call is answered instantly, around the clock. No busy tones, no voicemail, no missed opportunities.",
  },
  {
    icon: Bot,
    title: "Natural conversation",
    description:
      "Realtime AI speaks naturally, asks the right questions, and handles the call the way a trained receptionist would.",
  },
  {
    icon: CalendarCheck,
    title: "Booking & transfers",
    description:
      "Books appointments from your live availability, transfers to a human when needed, and takes messages for callbacks.",
  },
  {
    icon: UserPlus,
    title: "CRM capture",
    description:
      "Every caller becomes a contact. Calls create timeline entries, open opportunities, and trigger follow-up workflows.",
  },
  {
    icon: FileText,
    title: "Summaries & transcripts",
    description:
      "After each call you get a written summary, the caller's intent, captured details, and a full word-for-word transcript.",
  },
  {
    icon: ShieldCheck,
    title: "Private & secure",
    description:
      "Recording is off by default. When you switch it on, callers hear a clear announcement and recordings stay private to your workspace.",
  },
];

const testimonials = [
  {
    quote:
      "We stopped missing after-hours calls overnight. The AI books the appointment before we even see it in the morning.",
    name: "Illustrative example",
    role: "Home services business",
  },
  {
    quote:
      "Every call now has a summary and transcript in the CRM. My team knows exactly what each caller wanted before they follow up.",
    name: "Illustrative example",
    role: "Clinic reception lead",
  },
  {
    quote:
      "It handles the booking, opens the opportunity, and triggers the follow-up — all without a human touching it.",
    name: "Illustrative example",
    role: "Marketing agency owner",
  },
];

const faqs = [
  {
    q: "What is NexusFlo Voice?",
    a: "NexusFlo Voice is an AI telephone receptionist built into NexusFlo24. It answers every call to your business number, has a natural conversation, books appointments, captures details, and syncs everything to your CRM — the same CRM, contacts, pipeline, and billing you already use.",
  },
  {
    q: "Do I need a separate account?",
    a: "No. NexusFlo Voice is part of your existing NexusFlo24 workspace. It shares the same login, team members, CRM, bookings, automations, and billing — there is no second platform to manage.",
  },
  {
    q: "How does it know about my business?",
    a: "You give the assistant a knowledge base — FAQs, services, policies, and notes — in the Voice section of your dashboard. It also reads documents and web pages you add. It only answers from what you provide, so it never invents facts about your business.",
  },
  {
    q: "Is call recording on?",
    a: "No. Recording is off by default. If you turn it on for your workspace, callers hear a clear recording announcement, recordings are stored privately, and you can set a retention period. Only authorised workspace admins can delete a recording early.",
  },
  {
    q: "Can it book appointments?",
    a: "Yes. The assistant checks your real availability and books into the same booking engine the rest of NexusFlo24 uses. It can also transfer a call to a human or create a callback task.",
  },
  {
    q: "What about after hours?",
    a: "NexusFlo Voice answers every call, day or night, weekends and holidays included. Calls outside your opening hours are handled the same way — answered, understood, and actioned.",
  },
  {
    q: "Is it available right now?",
    a: "NexusFlo Voice is in early access. The dashboard section is available now so you can set up your assistant, knowledge base, and phone number. Live calling switches on once the voice gateway and a connected phone number are configured. You will see a clear setup status in your dashboard at every step.",
  },
];

export default function AiReceptionist() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="NexusFlo Voice — AI Telephone Receptionist | NexusFlo24"
        description="NexusFlo Voice answers every call to your business, day or night. It books appointments, captures details, and syncs to your CRM — built into NexusFlo24."
        path="/ai-receptionist"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "NexusFlo Voice — AI Telephone Receptionist",
          description:
            "AI telephone receptionist that answers every call, books appointments, captures leads, and syncs to your CRM. Built into NexusFlo24.",
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
                NexusFlo Voice
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary md:text-5xl lg:text-6xl">
                Every call answered. Every opportunity captured.
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                An AI telephone receptionist that answers your business line around the clock,
                books appointments, captures every lead, and syncs straight to your CRM — built
                into NexusFlo24.
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
                src={heroImg}
                alt="AI telephone receptionist answering a business call"
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
              Built into NexusFlo24 — shared CRM, bookings, automations, and billing
            </p>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Every missed call is a missed customer
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Most businesses never find out how many leads they lose to an unanswered phone.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {painPoints.map((p, i) => {
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

        {/* HOW IT WORKS */}
        <section className="border-y border-border/60 bg-surface py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                From ring to revenue, automatically
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="relative">
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-full">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                        {i + 1}
                      </div>
                      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-primary">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {i < steps.length - 1 && (
                      <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-accent lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                A receptionist that never sleeps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to answer, understand, and act on every call — in one place.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
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

        {/* EARLY ACCESS CALLOUT */}
        <section className="border-y border-border/60 bg-surface py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-card p-8 text-center shadow-sm md:p-10">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-primary md:text-3xl">
                NexusFlo Voice is in early access
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                You can set up your assistant, knowledge base, and phone number in the dashboard
                right now. Live calling switches on once the voice gateway and a connected number
                are configured — you will see a clear setup status at every step.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-accent" /> Recording off by default
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-accent" /> Same CRM and billing
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-accent" /> UK numbers first
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                What it looks like in practice
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Illustrative examples of how NexusFlo Voice fits a real business.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
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

        {/* PRICING TEASER */}
        <section className="border-y border-border/60 bg-surface py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                Starter plan
              </span>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
                200 included minutes a month
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                The Starter plan includes 200 voice minutes per billing period, one active
                assistant, one phone number, and one concurrent call — with usage warnings at 80%
                and 100%.
              </p>
              <div className="mt-8 flex justify-center">
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="border-primary text-primary">
                    See full pricing
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* MID CTA */}
        <section className="bg-primary py-16 text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
              Stop missing calls. Start capturing every lead.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg">
              Set up your AI receptionist inside NexusFlo24 today — no second account, no extra
              billing, no missed calls.
            </p>
            <div className="mt-8 flex justify-center">
              <CtaButtons />
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
              {faqs.map((f, i) => (
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
                Ready to answer every call?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Start your free trial and set up your AI receptionist inside NexusFlo24 — the same
                CRM, bookings, and billing you already use.
              </p>
              <div className="mt-8 flex justify-center">
                <CtaButtons />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
