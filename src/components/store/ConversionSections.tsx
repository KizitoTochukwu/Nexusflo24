import { Link } from "react-router-dom";
import {
  CalendarClock, CalendarDays, Check, FileCheck, FlaskConical, LifeBuoy, Quote,
  ShieldCheck, Users, X,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  FIT_CALL_PATH, NOT_INCLUDED_ITEMS, NOT_INCLUDED_NOTE, ORDER_ASSURANCE,
  PRODUCT_FAQS, PRODUCT_TRUST_POINTS,
} from "@/lib/store/constants";

const ICONS: Record<string, typeof ShieldCheck> = {
  FileCheck, ShieldCheck, Users, FlaskConical, LifeBuoy, CalendarClock,
};

/** Secondary pre-sale CTA — books the free automation fit call. */
export function FitCallCta({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const dark = variant === "dark";
  return (
    <div className={dark ? "mt-3" : "mt-6"}>
      <Button
        asChild
        variant="outline"
        className={
          dark
            ? "w-full border-gold/40 bg-transparent text-white hover:bg-gold/10"
            : "w-full sm:w-auto"
        }
      >
        <Link to={FIT_CALL_PATH}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Book a Free 15-Minute Automation Fit Call
        </Link>
      </Button>
      <p className={`mt-2 text-xs ${dark ? "text-white/50" : "text-muted-foreground"}`}>
        Not sure this is the right automation? We will help you choose before you buy.
      </p>
    </div>
  );
}

/** Compact purchase assurance list shown beside the buy action. */
export function OrderAssurance({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const dark = variant === "dark";
  return (
    <ul className={`mt-5 space-y-2 text-xs ${dark ? "text-white/60" : "text-muted-foreground"}`}>
      {ORDER_ASSURANCE.map((point) => (
        <li key={point} className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

/** "A safer, clearer way to automate" trust + social-proof slots. */
export function ProductTrustSection() {
  return (
    <section className="bg-surface py-14">
      <div className="container">
        <h2 className="text-2xl font-bold md:text-3xl">A safer, clearer way to automate</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every automation follows the same disciplined delivery process, so you always know what
          you are buying and what happens next.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_TRUST_POINTS.map((point) => {
            const Icon = ICONS[point.icon] ?? ShieldCheck;
            return (
              <div key={point.title} className="rounded-xl border bg-card p-5">
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 font-semibold">{point.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{point.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-dashed bg-card/60 p-6">
            <Quote className="h-5 w-5 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Customer testimonials</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified customer feedback for this automation will appear here as it is collected.
            </p>
          </div>
          <div className="rounded-xl border border-dashed bg-card/60 p-6">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Case studies</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Published implementation case studies will be linked here once released.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Standard exclusions block. */
export function NotIncludedSection() {
  return (
    <section className="bg-background py-14">
      <div className="container">
        <h2 className="text-2xl font-bold md:text-3xl">What is not included</h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {NOT_INCLUDED_ITEMS.map((item) => (
            <li key={item} className="flex gap-3 rounded-lg border bg-card p-4 text-sm">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-3xl text-sm text-muted-foreground">{NOT_INCLUDED_NOTE}</p>
      </div>
    </section>
  );
}

/** Standard FAQ accordion. */
export function ProductFaq() {
  return (
    <section className="bg-surface py-14">
      <div className="container max-w-3xl">
        <h2 className="text-2xl font-bold md:text-3xl">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-6">
          {PRODUCT_FAQS.map((faq, i) => (
            <AccordionItem key={faq.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export const faqMainEntity = PRODUCT_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  }));

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqMainEntity,
};
