import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RoiCalculatorWizard from "@/components/roi/RoiCalculatorWizard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Loader2,
  Lock,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Bell,
  BarChart3,
  Sparkles,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BUSINESS_TYPES,
  CONTACT_METHODS,
  CalculatorInputs,
  buildRecommendations,
  calculate,
  formatCurrency,
  getUtmParams,
  intentTags,
  isHighIntent,
} from "@/lib/roi/calculator";
import { useRoiCalculatorSettings } from "@/hooks/useRoiCalculatorSettings";

const DEFAULTS: CalculatorInputs = {
  currency: "GBP",
  leads_per_month: 100,
  average_customer_value: 500,
  conversion_rate: 10,
  missed_follow_up_percentage: 30,
  manual_follow_up_hours: 40,
  staff_cost_per_hour: 20,
  monthly_software_cost: 100,
};

const FAQS = [
  {
    q: "How accurate is the ROI Savings Calculator?",
    a: "The calculator provides an estimate based on the information entered. It is intended to help identify potential revenue and efficiency opportunities.",
  },
  {
    q: "Does NexusFlo24 guarantee these savings?",
    a: "No. Results depend on lead quality, offer strength, market conditions, sales execution and how the automation is implemented.",
  },
  {
    q: "Can NexusFlo24 automate WhatsApp, SMS and email?",
    a: "Yes. NexusFlo24 is designed to support multichannel communication and automated lead follow-up.",
  },
  {
    q: "Can I use the calculator without creating an account?",
    a: "Yes. Visitors can calculate a preview without creating an account, but contact details are required to unlock the full report.",
  },
  {
    q: "What happens after I submit my details?",
    a: "You receive the full estimate and may receive relevant follow-up about improving your sales and automation process.",
  },
  {
    q: "Will my information be shared?",
    a: "No. Information is managed according to the NexusFlo24 privacy policy and is not sold to unrelated third parties.",
  },
];

const analytics = (event: string, props: Record<string, unknown> = {}) => {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; fbq?: (...a: unknown[]) => void };
    w.dataLayer?.push({ event, ...props });
    w.fbq?.("trackCustom", event, props);
  } catch {
    /* ignore */
  }
};

const RoiSavingsCalculator = () => {
  const calcRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULTS);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    business_name: "",
    business_type: "",
    preferred_contact_method: "Email",
    consent: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: roiSettings } = useRoiCalculatorSettings();
  const bookingUrl = roiSettings?.booking_url ?? "/book/30-minute-discovery-call-9f5d5f";

  const results = useMemo(() => calculate(inputs), [inputs]);
  const recommendations = useMemo(
    () => buildRecommendations(inputs, results, roiSettings),
    [inputs, results, roiSettings],
  );
  const highIntent = useMemo(
    () => isHighIntent(inputs, results, roiSettings),
    [inputs, results, roiSettings],
  );

  const fmt = (n: number) => formatCurrency(n, inputs.currency);


  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleCalculate = () => {
    analytics("roi_calculator_completed", {
      currency: inputs.currency,
      leads_per_month: inputs.leads_per_month,
    });
    analytics("roi_calculator_preview_viewed");
    setStep(2);
    setLeadDialogOpen(true);
    setTimeout(() => scrollTo(resultsRef), 100);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.phone.trim()) errs.phone = "Required";
    if (!form.business_name.trim()) errs.business_name = "Required";
    if (!form.business_type) errs.business_type = "Required";
    if (!form.preferred_contact_method) errs.preferred_contact_method = "Required";
    if (!form.consent) errs.consent = "Consent required to receive your results";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please complete the required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const recommendationText = recommendations.map((r) => `• ${r.message}`).join("\n");
      const utm = getUtmParams();
      const { data, error } = await supabase.functions.invoke("roi-calculator-submit", {
        body: {
          ...form,
          ...inputs,
          recommendation: recommendationText,
          tags: intentTags(inputs, results, roiSettings),
          ...utm,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      analytics("roi_calculator_lead_submitted", {
        currency: inputs.currency,
        business_type: form.business_type,
        monthly_opportunity_band:
          results.estimated_monthly_opportunity >= 5000
            ? "5k+"
            : results.estimated_monthly_opportunity >= 1000
              ? "1k-5k"
              : "under-1k",
        high_intent: highIntent,
      });
      setSubmitted(true);
      setStep(3);
      setLeadDialogOpen(false);
      toast.success("Your full savings estimate is ready.");
      setTimeout(() => scrollTo(resultsRef), 100);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? `Could not save your results — ${err.message}. Please try again.`
          : "Could not save your results. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const trackBookingClick = () => analytics("roi_calculator_booking_clicked");

  // Track initial page view once
  useMemo(() => {
    analytics("roi_calculator_page_viewed");
    return null;
  }, []);

  // Breakdown bar segments
  const totalOpp = Math.max(1, results.estimated_monthly_opportunity);
  const seg = (v: number) => Math.min(100, Math.round((v / totalOpp) * 100));
  const segMissed = seg(results.recoverable_revenue);
  const segAdmin = seg(results.manual_admin_cost);
  const segSoftware = seg(inputs.monthly_software_cost);

  return (
    <Layout>
      <Seo
        title="ROI Savings Calculator"
        description="Calculate how much revenue your business may be losing through missed follow-ups, slow lead response and manual sales processes."
        path="/tools/roi-savings-calculator"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary via-primary to-navy-light text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#C9A227_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="container relative py-14 md:py-20">
          <div className="mx-auto text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Free ROI Savings Calculator
            </div>
            <h1 className="mx-auto max-w-[850px] text-4xl font-bold leading-tight tracking-tight text-accent md:text-5xl">
              Calculate the Revenue You’re Losing From Missed Follow-Up
            </h1>
            <p className="mx-auto mt-6 max-w-[720px] text-lg text-primary-foreground/80 md:text-xl">
              Enter a few details about your leads, conversion rate and manual follow-up process to
              estimate your monthly and annual revenue opportunity.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                onClick={() => scrollTo(calcRef)}
              >
                Calculate My Savings <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to={bookingUrl} onClick={trackBookingClick}>
                  Book a Free Automation Audit
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-primary-foreground/60">
              Free to use. No commitment. Takes less than two minutes.
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR + PROGRESS */}
      <section ref={calcRef} className="bg-background py-16 md:py-20">
        <div className="container">
          {/* Progress */}
          <div className="mx-auto mb-10 max-w-3xl">
            <div className="grid grid-cols-3 gap-2 text-center text-xs md:text-sm">
              {[
                { n: 1, label: "Your Current Process" },
                { n: 2, label: "Your Estimated Opportunity" },
                { n: 3, label: "Get Your Full Report" },
              ].map((s) => (
                <div
                  key={s.n}
                  className={`rounded-lg border px-3 py-2 font-medium transition-colors ${
                    step >= (s.n as 1 | 2 | 3)
                      ? "border-accent bg-accent/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span className="mr-1 font-bold text-accent">Step {s.n}:</span> {s.label}
                </div>
              ))}
            </div>
            <Progress value={(step / 3) * 100} className="mt-3 h-1.5" />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT: GUIDED WIZARD or LOCKED SUMMARY */}
            {step < 2 ? (
              <RoiCalculatorWizard
                inputs={inputs}
                setInputs={(next) => setInputs(next)}
                onStart={() => {
                  if (!started) {
                    setStarted(true);
                    analytics("roi_calculator_started", { currency: inputs.currency });
                  }
                }}
                onCalculate={handleCalculate}
              />
            ) : (
              <Card className="border-accent/40 bg-muted/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Your inputs are locked
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your estimate is ready on the right. You can edit your answers or unlock the full personalised report.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <SummaryRow label="Currency" value={inputs.currency} />
                    <SummaryRow label="Leads / month" value={String(inputs.leads_per_month)} />
                    <SummaryRow label="Avg customer value" value={fmt(inputs.average_customer_value)} />
                    <SummaryRow label="Conversion rate" value={`${inputs.conversion_rate}%`} />
                    <SummaryRow label="Missed follow-up" value={`${inputs.missed_follow_up_percentage}%`} />
                    <SummaryRow label="Manual hours / mo" value={String(inputs.manual_follow_up_hours)} />
                  </div>
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setStep(1);
                        setSubmitted(false);
                        setLeadDialogOpen(false);
                      }}
                    >
                      Edit answers
                    </Button>
                    {!submitted && (
                      <Button
                        className="w-full bg-accent text-accent-foreground shadow-gold hover:bg-gold-dark sm:w-auto"
                        onClick={() => setLeadDialogOpen(true)}
                      >
                        <Lock className="mr-1 h-4 w-4" /> Unlock full report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}



            {/* RIGHT: LIVE PREVIEW */}
            <div ref={resultsRef} className="space-y-4">
              <Card className="border-accent/40 bg-primary text-primary-foreground shadow-lg">
                <CardHeader>
                  <p className="text-xs uppercase tracking-wider text-accent">
                    {submitted ? "Your full report" : step >= 2 ? "Preview result" : "Live estimate"}
                  </p>
                  <CardTitle className="text-2xl leading-tight">
                    {step >= 2 ? (
                      <>
                        You're missing out on about{" "}
                        <span className="text-accent">
                          {fmt(results.estimated_monthly_opportunity)}
                        </span>{" "}
                        every month.
                      </>
                    ) : (
                      <>Your estimated savings will appear here.</>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {step < 2 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary-foreground/20 bg-primary-foreground/5 px-4 py-10 text-center">
                      <Calculator className="h-10 w-10 text-accent" />
                      <p className="text-sm text-primary-foreground/80">
                        Complete the questions to see your estimated monthly and annual
                        opportunity.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBlock
                          label="Est monthly opportunity"
                          value={fmt(results.estimated_monthly_opportunity)}
                          strong
                        />
                        <StatBlock
                          label="Est annual opportunity"
                          value={fmt(results.estimated_annual_opportunity)}
                          strong
                        />
                        <StatBlock
                          label="Recoverable customers / mo"
                          value={results.recoverable_customers.toFixed(1)}
                        />
                        <StatBlock
                          label="Missed follow-up revenue"
                          value={fmt(results.recoverable_revenue)}
                        />
                        <StatBlock
                          label="Manual admin cost / mo"
                          value={fmt(results.manual_admin_cost)}
                        />
                        <StatBlock
                          label="Current est monthly revenue"
                          value={fmt(results.current_monthly_revenue)}
                        />
                      </div>

                      {/* Breakdown bar */}
                      <div className="pt-2">
                        <p className="mb-2 text-xs text-primary-foreground/70">Opportunity breakdown</p>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-primary-foreground/10">
                          <div className="bg-accent" style={{ width: `${segMissed}%` }} title="Missed follow-up revenue" />
                          <div className="bg-gold-dark" style={{ width: `${segAdmin}%` }} title="Manual admin cost" />
                          <div className="bg-primary-foreground/40" style={{ width: `${segSoftware}%` }} title="Software / admin cost" />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-primary-foreground/60">
                          <span>Missed follow-up {segMissed}%</span>
                          <span>Manual admin {segAdmin}%</span>
                          <span>Software {segSoftware}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>


              <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                      <Lock className="h-4 w-4 text-accent" /> Unlock your full report
                    </DialogTitle>
                    <DialogDescription>
                      Enter your details to receive personalised recommendations and next steps.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Full name *" error={formErrors.full_name}>
                        <Input
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Work email *" error={formErrors.email}>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Phone number *" error={formErrors.phone}>
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Business name *" error={formErrors.business_name}>
                        <Input
                          value={form.business_name}
                          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Business type *" error={formErrors.business_type}>
                        <Select
                          value={form.business_type}
                          onValueChange={(v) => setForm({ ...form, business_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Preferred contact method *"
                        error={formErrors.preferred_contact_method}
                      >
                        <Select
                          value={form.preferred_contact_method}
                          onValueChange={(v) =>
                            setForm({ ...form, preferred_contact_method: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                      <Checkbox
                        checked={form.consent}
                        onCheckedChange={(v) => setForm({ ...form, consent: v === true })}
                        className="mt-0.5"
                      />
                      <span className="text-muted-foreground">
                        I agree to receive my calculator results and relevant follow-up from
                        NexusFlo24. I understand that I can unsubscribe at any time.
                      </span>
                    </label>
                    {formErrors.consent && (
                      <p className="text-xs text-destructive">{formErrors.consent}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="w-full bg-accent text-accent-foreground hover:bg-gold-dark"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing your report…
                        </>
                      ) : (
                        <>
                          Unlock My Full Report <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      By submitting, you agree to our{" "}
                      <Link to="/privacy-policy" className="underline">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms-of-service" className="underline">
                        Terms of Service
                      </Link>
                      .
                    </p>
                  </form>
                </DialogContent>
              </Dialog>


              {submitted && (
                <Card className="border-emerald-500/40 bg-emerald-50">
                  <CardContent className="flex items-start gap-3 pt-6">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div className="text-sm text-emerald-900">
                      <p className="font-semibold">Your full savings estimate is ready.</p>
                      <p>
                        The next step is to identify which automations could recover the biggest
                        opportunity first.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {submitted && recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personalised recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((r) => (
                      <div
                        key={r.key}
                        className="rounded-md border border-accent/30 bg-accent/5 p-3 text-sm"
                      >
                        {r.message}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                <Info className="mr-1 inline h-3 w-3" />
                This calculator provides an estimate based on the information entered. Actual
                results depend on lead quality, offer strength, customer behaviour, implementation
                and sales follow-up performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-primary md:text-4xl">
              How NexusFlo24 Helps Recover More Revenue
            </h2>
            <p className="mt-3 text-muted-foreground">
              An all-in-one AI system to capture, nurture and convert every enquiry.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Users,
                title: "Lead capture",
                desc: "Capture enquiries from forms, landing pages, campaigns and website activity.",
              },
              {
                Icon: MessageSquare,
                title: "Automated follow-up",
                desc: "Send timely email, SMS and WhatsApp messages without relying on manual reminders.",
              },
              {
                Icon: TrendingUp,
                title: "Smart CRM",
                desc: "Store, organise, score and manage every prospect from one place.",
              },
              {
                Icon: Bell,
                title: "Sales notifications",
                desc: "Alert team members when a qualified or high-value lead takes action.",
              },
              {
                Icon: Calendar,
                title: "Appointment booking",
                desc: "Allow prospects to book calls automatically and receive reminders.",
              },
              {
                Icon: BarChart3,
                title: "Performance tracking",
                desc: "Track leads, conversations, bookings, campaign results and conversion activity.",
              },
            ].map(({ Icon, title, desc }) => (
              <Card key={title} className="border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-semibold text-primary">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="bg-background py-16 md:py-20">
        <div className="container mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium text-primary">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Layout>
  );
};


const FormField = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-primary">{label}</Label>
    {children}
    {error && <p className="text-[11px] text-destructive">{error}</p>}
  </div>
);

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}

const StatBlock = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div className="rounded-lg bg-primary-foreground/5 p-3">
    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">{label}</p>
    <p
      className={`mt-1 font-semibold ${strong ? "text-xl text-accent" : "text-base text-primary-foreground"}`}
    >
      {value}
    </p>
  </div>
);

export default RoiSavingsCalculator;
