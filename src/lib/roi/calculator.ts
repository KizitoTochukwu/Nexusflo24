// ROI Savings Calculator — pure helpers.
// Kept transparent and easy to maintain. All results are estimates.

export type Currency = "GBP" | "USD" | "EUR" | "NGN";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "NGN", label: "NGN (₦)", symbol: "₦" },
];

export const BUSINESS_TYPES = [
  "Coach or consultant",
  "Creator",
  "Marketing agency",
  "Local business",
  "Ecommerce business",
  "Professional services",
  "SaaS or technology company",
  "Property or real estate",
  "Healthcare",
  "Education or training",
  "Other",
];

export const CONTACT_METHODS = ["Email", "WhatsApp", "Phone call"];

// Fallback defaults — used until the roi_calculator_settings row is loaded from the DB.
// Admins edit these live via public.roi_calculator_settings (see get_roi_calculator_settings RPC).
export const DEFAULT_ROI_CALCULATOR_BOOKING_URL = "/book/30-minute-discovery-call-9f5d5f";

/** @deprecated Use useRoiCalculatorSettings() / DEFAULT_ROI_CALCULATOR_BOOKING_URL. Kept for older imports. */
export const ROI_CALCULATOR_BOOKING_URL = DEFAULT_ROI_CALCULATOR_BOOKING_URL;

// Currency-specific thresholds for recommendations & high-intent scoring.
// Each currency has its own configurable value; NGN defaults use an FX-adjusted equivalent (~1900x GBP).
export const DEFAULT_HIGH_OPP_THRESHOLD: Record<Currency, number> = {
  GBP: 1000,
  USD: 1000,
  EUR: 1000,
  NGN: 1_900_000,
};

export const DEFAULT_HIGH_ADMIN_THRESHOLD: Record<Currency, number> = {
  GBP: 500,
  USD: 500,
  EUR: 500,
  NGN: 950_000,
};

export interface RoiCalculatorSettings {
  booking_url: string;
  high_opportunity_thresholds: Record<Currency, number>;
  high_admin_thresholds: Record<Currency, number>;
}

export const DEFAULT_ROI_CALCULATOR_SETTINGS: RoiCalculatorSettings = {
  booking_url: DEFAULT_ROI_CALCULATOR_BOOKING_URL,
  high_opportunity_thresholds: DEFAULT_HIGH_OPP_THRESHOLD,
  high_admin_thresholds: DEFAULT_HIGH_ADMIN_THRESHOLD,
};

/** Back-compat: legacy names still referenced elsewhere. */
export const HIGH_OPP_THRESHOLD = DEFAULT_HIGH_OPP_THRESHOLD;
export const HIGH_ADMIN_THRESHOLD = DEFAULT_HIGH_ADMIN_THRESHOLD;

export interface CalculatorInputs {
  currency: Currency;
  leads_per_month: number;
  average_customer_value: number;
  conversion_rate: number; // percentage 0-100
  missed_follow_up_percentage: number; // 0-100
  manual_follow_up_hours: number;
  staff_cost_per_hour: number;
  monthly_software_cost: number;
}

export interface CalculatorResults {
  current_customers: number;
  current_monthly_revenue: number;
  missed_leads: number;
  recoverable_customers: number;
  recoverable_revenue: number;
  manual_admin_cost: number;
  estimated_monthly_opportunity: number;
  estimated_annual_opportunity: number;
  estimated_annual_recoverable_revenue: number;
  estimated_annual_admin_cost: number;
}

const safeNum = (v: number) => (Number.isFinite(v) && !Number.isNaN(v) ? Math.max(0, v) : 0);

export function calculate(inputs: CalculatorInputs): CalculatorResults {
  const leads = safeNum(inputs.leads_per_month);
  const acv = safeNum(inputs.average_customer_value);
  const convRate = Math.min(100, Math.max(0, safeNum(inputs.conversion_rate)));
  const missedPct = Math.min(100, Math.max(0, safeNum(inputs.missed_follow_up_percentage)));
  const hours = safeNum(inputs.manual_follow_up_hours);
  const staffCost = safeNum(inputs.staff_cost_per_hour);
  const softwareCost = safeNum(inputs.monthly_software_cost);

  const current_customers = leads * (convRate / 100);
  const current_monthly_revenue = current_customers * acv;
  const missed_leads = leads * (missedPct / 100);
  const recoverable_customers = missed_leads * (convRate / 100);
  const recoverable_revenue = recoverable_customers * acv;
  const manual_admin_cost = hours * staffCost;
  const estimated_monthly_opportunity = recoverable_revenue + manual_admin_cost + softwareCost;
  const estimated_annual_opportunity = estimated_monthly_opportunity * 12;

  return {
    current_customers,
    current_monthly_revenue,
    missed_leads,
    recoverable_customers,
    recoverable_revenue,
    manual_admin_cost,
    estimated_monthly_opportunity,
    estimated_annual_opportunity,
    estimated_annual_recoverable_revenue: recoverable_revenue * 12,
    estimated_annual_admin_cost: manual_admin_cost * 12,
  };
}

export function formatCurrency(amount: number, currency: Currency): string {
  const locale =
    currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : currency === "NGN" ? "en-NG" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(safeNum(amount));
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export interface Recommendation {
  key: string;
  message: string;
}

export function buildRecommendations(
  inputs: CalculatorInputs,
  results: CalculatorResults,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (inputs.missed_follow_up_percentage >= 25) {
    recs.push({
      key: "follow_up_gap",
      message:
        "Your biggest opportunity is improving lead response and follow-up consistency. Start with instant email, WhatsApp or SMS acknowledgement followed by a structured nurturing sequence.",
    });
  }

  if (results.manual_admin_cost >= HIGH_ADMIN_THRESHOLD[inputs.currency]) {
    recs.push({
      key: "manual_admin",
      message:
        "Your team is spending significant time on repetitive administration. Automating CRM updates, follow-up tasks, reminders and appointment booking could reduce this workload.",
    });
  }

  if (inputs.conversion_rate < 10) {
    recs.push({
      key: "low_conversion",
      message:
        "Your lead volume may not be the main problem. Your conversion process, response speed, qualification and nurturing sequence may need improvement.",
    });
  }

  if (results.estimated_monthly_opportunity >= HIGH_OPP_THRESHOLD[inputs.currency]) {
    recs.push({
      key: "high_value",
      message:
        "Your estimated opportunity is substantial. A personalised automation audit is recommended so NexusFlo24 can identify the highest-impact workflow to implement first.",
    });
  }

  return recs;
}

export function isHighIntent(inputs: CalculatorInputs, results: CalculatorResults): boolean {
  return (
    results.estimated_monthly_opportunity >= HIGH_OPP_THRESHOLD[inputs.currency] ||
    inputs.leads_per_month >= 100 ||
    inputs.missed_follow_up_percentage >= 30
  );
}

export function intentTags(inputs: CalculatorInputs, results: CalculatorResults): string[] {
  const tags: string[] = ["roi-calculator-lead"];
  if (isHighIntent(inputs, results)) tags.push("high-intent");
  if (results.estimated_monthly_opportunity >= HIGH_OPP_THRESHOLD[inputs.currency])
    tags.push("high-roi-opportunity");
  if (results.manual_admin_cost >= HIGH_ADMIN_THRESHOLD[inputs.currency])
    tags.push("manual-process-heavy");
  if (inputs.missed_follow_up_percentage >= 25) tags.push("follow-up-gap");
  return tags;
}

export function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const out: Record<string, string> = {};
  keys.forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}
