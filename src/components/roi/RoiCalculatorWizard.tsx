import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Calculator } from "lucide-react";
import { CURRENCIES, CalculatorInputs, Currency } from "@/lib/roi/calculator";

interface Props {
  inputs: CalculatorInputs;
  setInputs: (i: CalculatorInputs) => void;
  onCalculate: () => void;
  onStart?: () => void;
}

type NumKey = Exclude<keyof CalculatorInputs, "currency">;

const TOTAL_STEPS = 8;
const STORAGE_KEY = "nf24:roi-wizard";

const currencySymbol = (c: Currency) =>
  CURRENCIES.find((x) => x.code === c)?.symbol ?? "";

interface StepDef {
  key: keyof CalculatorInputs;
  heading: string;
  help: string;
  kind: "currency-select" | "number" | "percent" | "money";
  placeholder?: string;
  chips?: number[];
  optional?: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "currency",
    heading: "What currency would you like to use?",
    help: "We will use this currency when calculating your estimated savings and revenue opportunity.",
    kind: "currency-select",
  },
  {
    key: "leads_per_month",
    heading: "How many new leads does your business generate each month?",
    help: "Include website enquiries, form submissions, calls, campaign leads, WhatsApp enquiries and other potential customers.",
    kind: "number",
    placeholder: "100",
    chips: [25, 50, 100, 250, 500],
  },
  {
    key: "average_customer_value",
    heading: "What is the average value of one new customer?",
    help: "Enter the typical revenue your business earns when one lead becomes a paying customer.",
    kind: "money",
    placeholder: "500",
  },
  {
    key: "conversion_rate",
    heading: "What percentage of your leads currently become paying customers?",
    help: "Enter your estimated lead-to-customer conversion rate. A rough estimate is acceptable.",
    kind: "percent",
    placeholder: "10",
    chips: [5, 10, 15, 20, 25],
  },
  {
    key: "missed_follow_up_percentage",
    heading: "What percentage of your leads do not receive proper follow-up?",
    help: "Include leads that receive no response, late replies, inconsistent follow-up or only one attempt.",
    kind: "percent",
    placeholder: "30",
    chips: [10, 20, 30, 40, 50],
  },
  {
    key: "manual_follow_up_hours",
    heading: "How many hours does your team spend on manual follow-up each month?",
    help: "Include sending messages, updating spreadsheets, assigning leads, arranging appointments and chasing responses.",
    kind: "number",
    placeholder: "40",
    chips: [10, 20, 40, 80, 100],
  },
  {
    key: "staff_cost_per_hour",
    heading: "What is the average hourly cost of the person managing your follow-up?",
    help: "Include salary, contractor fees or the estimated value of your own time.",
    kind: "money",
    placeholder: "20",
  },
  {
    key: "monthly_software_cost",
    heading: "How much do you currently spend each month on sales, CRM and administration tools?",
    help: "Include CRM software, email platforms, messaging tools, spreadsheets, booking tools and other systems. This question is optional.",
    kind: "money",
    placeholder: "100",
    optional: true,
  },
];

export default function RoiCalculatorWizard({ inputs, setInputs, onCalculate, onStart }: Props) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore session state once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.inputs) setInputs({ ...inputs, ...parsed.inputs });
        if (typeof parsed?.step === "number" && parsed.step >= 1 && parsed.step <= TOTAL_STEPS) {
          setStep(parsed.step);
        }
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, step }));
    } catch {
      /* ignore */
    }
  }, [inputs, step, restored]);

  // Focus heading on step change
  useEffect(() => {
    headingRef.current?.focus();
    setError(null);
    setTouched(false);
  }, [step]);

  const def = STEPS[step - 1];
  const isFinal = step === TOTAL_STEPS;

  const currentValue = (): number | string => {
    const v = inputs[def.key];
    return v as number | string;
  };

  const validate = (): string | null => {
    if (def.kind === "currency-select") return null;
    const raw = inputs[def.key as NumKey];
    if (def.optional && (raw === 0 || raw === undefined || raw === null)) return null;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return "Please enter a valid number.";
    if (raw < 0) return "Value cannot be negative.";
    if (def.kind === "percent" && raw > 100) return "Percentage must be between 0 and 100.";
    if (!def.optional && raw === 0 && def.kind !== "percent")
      return "Please enter a value greater than zero.";
    return null;
  };

  const handleNext = () => {
    setTouched(true);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (isFinal) {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      onCalculate();
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSkip = () => {
    if (!def.optional) return;
    setInputs({ ...inputs, [def.key]: 0 });
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    onCalculate();
  };

  const setNumberValue = (raw: string) => {
    if (onStart) onStart();
    if (raw === "") {
      setInputs({ ...inputs, [def.key]: 0 });
      return;
    }
    let n = parseFloat(raw);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (def.kind === "percent") n = Math.min(100, n);
    setInputs({ ...inputs, [def.key]: n });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  const symbol = currencySymbol(inputs.currency);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-accent" /> Business inputs
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground">
            Question {step} of {TOTAL_STEPS}
          </span>
        </div>
        <Progress
          value={(step / TOTAL_STEPS) * 100}
          aria-label={`Progress: question ${step} of ${TOTAL_STEPS}`}
          className="mt-3 h-1.5"
        />
      </CardHeader>

      <CardContent className="pt-6">
        <div key={step} className="animate-in fade-in duration-200">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-primary outline-none md:text-2xl"
          >
            {def.heading}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{def.help}</p>

          <div className="mt-6 space-y-4">
            {def.kind === "currency-select" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CURRENCIES.map((c) => {
                  const active = inputs.currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setInputs({ ...inputs, currency: c.code })}
                      aria-pressed={active}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-primary"
                          : "border-border bg-background hover:border-accent/60"
                      }`}
                    >
                      <div className="text-2xl font-bold text-accent">{c.symbol}</div>
                      <div className="mt-1 text-sm font-semibold text-primary">{c.code}</div>
                      <div className="text-xs text-muted-foreground">{c.label.replace(/\s*\(.*\)/, "")}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <Label htmlFor={`step-${step}`} className="sr-only">
                  {def.heading}
                </Label>
                <div className="relative">
                  {def.kind === "money" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-muted-foreground"
                    >
                      {symbol}
                    </span>
                  )}
                  <Input
                    ref={inputRef}
                    id={`step-${step}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={def.kind === "percent" ? 100 : undefined}
                    step={def.kind === "money" ? "0.01" : "1"}
                    placeholder={def.placeholder}
                    value={
                      currentValue() === 0 && !touched && def.optional
                        ? ""
                        : (currentValue() as number | string)
                    }
                    onChange={(e) => setNumberValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    aria-invalid={!!error}
                    aria-describedby={error ? `step-${step}-err` : undefined}
                    className={`h-14 text-lg ${def.kind === "money" ? "pl-10" : ""} ${
                      def.kind === "percent" ? "pr-10" : ""
                    }`}
                  />
                  {def.kind === "percent" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg font-semibold text-muted-foreground"
                    >
                      %
                    </span>
                  )}
                </div>

                {def.chips && def.chips.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {def.chips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNumberValue(String(c))}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          Number(currentValue()) === c
                            ? "border-accent bg-accent/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-accent/60"
                        }`}
                      >
                        {def.kind === "percent"
                          ? `${c}%`
                          : def.key === "manual_follow_up_hours"
                            ? `${c} hours`
                            : c === 500 && def.key === "leads_per_month"
                              ? "500+"
                              : c === 25 && def.key === "conversion_rate"
                                ? "25%+"
                                : String(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p
                id={`step-${step}-err`}
                role="status"
                aria-live="polite"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {def.optional && isFinal && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                Skip this question
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handlePrev}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleNext}
            className="w-full bg-accent text-accent-foreground shadow-gold hover:bg-gold-dark sm:w-auto"
          >
            {isFinal ? "Calculate My Savings" : "Next"} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
