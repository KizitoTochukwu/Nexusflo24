import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Inbox,
  LineChart,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const STEPS = [
  {
    icon: Sparkles,
    title: "Describe what you sell",
    body: "Add your offer and website. The assistant reads your own site and drafts an ideal customer profile you review and approve — nothing is used until you say so.",
  },
  {
    icon: Building2,
    title: "Build a prospect list",
    body: "Import your own list by CSV, or connect a data provider to discover matching companies and decision-makers. Every prospect shows why it fits and where the information came from.",
  },
  {
    icon: Send,
    title: "Approve the sequence, then send",
    body: "Personalised cold-email sequences are drafted from real research. You approve every step before a single email leaves your own connected mailbox, inside your sending window and daily limit.",
  },
  {
    icon: Inbox,
    title: "Read the replies properly",
    body: "Replies are classified into outcomes such as interested, not now, referral or unsubscribe. You can correct any classification, and the correction is recorded.",
  },
  {
    icon: Target,
    title: "Push winners into your CRM",
    body: "One click turns an interested prospect into a contact, company and deal in the NexusFlo24 CRM — the same CRM you already use, not a copy of it.",
  },
  {
    icon: LineChart,
    title: "Measure what it produced",
    body: "Reports count real rows: prospects added, emails accepted by the provider, replies by outcome, contacts created and pipeline value attributed to Client Finder.",
  },
];

const HONEST = [
  "Emails send from your own business mailbox — Gmail or Microsoft — not a shared pool.",
  "Unsubscribe handling and a workspace suppression list are built in and enforced before every send.",
  "Where a data provider is not connected, the interface says so plainly and CSV import is used instead.",
  "\"Sent\" means accepted by the sending provider. We never claim inbox delivery we cannot prove.",
  "AI drafts copy and scores fit. It never sends, never writes to your CRM and never invents contact details.",
];

const FAQ = [
  {
    q: "Do I need a separate account?",
    a: "No. AI Client Finder lives inside your existing NexusFlo24 workspace and uses the same login, CRM, billing and permissions.",
  },
  {
    q: "Where does prospect data come from?",
    a: "From your own CSV imports, from your website and public company information, and from a B2B data provider if you connect one. Contact details are never fabricated.",
  },
  {
    q: "Can it send without my approval?",
    a: "No. A campaign only sends after you explicitly approve the sequence and launch it, and you can pause or stop it at any point.",
  },
  {
    q: "How much can I send?",
    a: "Your plan sets monthly email, AI and prospect allowances, and each campaign has its own daily limit and sending window. Allowances are enforced on the server.",
  },
];

export default function AiClientFinder() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="AI Client Finder — B2B Prospecting & Outbound | NexusFlo24"
        description="Find matching companies, identify decision-makers, research prospects and send approved, personalised cold-email sequences from your own mailbox — with replies classified and pushed into your CRM."
        path="/ai-client-finder"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "AI Client Finder",
          serviceType: "AI B2B prospecting and outbound sales",
          provider: { "@type": "Organization", name: "NexusFlo24" },
        }}
      />
      <Header />

      <main>
        <section className="border-b bg-secondary/30">
          <div className="container mx-auto grid gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Inside your NexusFlo24 workspace
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                Find the right companies. Reach the right people. Prove what it produced.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                AI Client Finder turns your offer into a researched prospect list, a personalised
                outbound sequence you approve, and pipeline you can actually trace back to a reply.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Start free trial <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/contact">Book a demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Uses your existing CRM, billing and team permissions — no second system to manage.
              </p>
            </div>

            <Card className="shadow-lg">
              <CardContent className="space-y-4 p-6">
                <p className="text-sm font-semibold">What a campaign looks like</p>
                {[
                  { icon: Upload, text: "Offer + ideal customer profile approved" },
                  { icon: Building2, text: "128 companies matched, each with a scored reason" },
                  { icon: Send, text: "4-step sequence reviewed, then launched from your mailbox" },
                  { icon: Inbox, text: "Replies classified: interested, not now, referral, opt-out" },
                  { icon: Target, text: "Interested prospects pushed to CRM as contact + deal" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 rounded-lg border p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Six steps, each one under your control.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="h-full">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-secondary/30">
          <div className="container mx-auto grid gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Sent responsibly
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">
                Outbound that respects the recipient — and tells you the truth
              </h2>
              <p className="mt-4 text-muted-foreground">
                Cold outreach only works when it is accurate, wanted and honestly reported. Client
                Finder is built that way by default.
              </p>
            </div>
            <ul className="space-y-4">
              {HONEST.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          <Accordion type="single" collapsible className="mt-8 max-w-3xl">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="border-t bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-16 text-center lg:py-20">
            <h2 className="text-3xl font-bold tracking-tight">Put your pipeline on a system</h2>
            <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/80">
              Start with your own list, approve one sequence, and watch replies land in the same
              workspace your CRM already lives in.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register">Start free trial</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
