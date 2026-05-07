import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes! The Starter plan includes a 14-day free trial — no credit card required. You can explore the platform risk-free before committing.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your dashboard settings. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "What happens when I hit my contact limit?",
    answer:
      "You'll receive a notification as you approach your limit. You can upgrade your plan to unlock more contacts, or archive inactive contacts to free up space.",
  },
  {
    question: "Do yearly plans really save 20%?",
    answer:
      "Yes — when you choose annual billing, you save 20% compared to paying monthly. The discount is applied automatically and you're billed once per year.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, Amex) through our secure payment processor, Stripe. All transactions are encrypted and PCI-compliant.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period. No hidden fees or penalties.",
  },
  {
    question: "What's included in the Enterprise plan?",
    answer:
      "Enterprise includes everything in Pro plus unlimited funnels, multi-client workspaces, white-label dashboard, custom branding, API access, and a dedicated account manager.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team within 7 days of your purchase for a full refund.",
  },
];

const PricingFaq = () => {
  return (
    <section className="py-20">
      <div className="container max-w-3xl bg-slate-200">
        <h2 className="mb-2 text-center text-2xl font-bold">
          Frequently Asked Questions
        </h2>
        <p className="mb-10 text-center text-muted-foreground">
          Everything you need to know about our plans and billing.
        </p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default PricingFaq;
