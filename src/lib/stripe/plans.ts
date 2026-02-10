export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";

export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPriceId: "price_PRO_MONTHLY",    // Replace with your actual Stripe price ID
    yearlyPriceId: "price_PRO_YEARLY",      // Replace with your actual Stripe price ID
    productId: "prod_PRO",                   // Replace with your actual Stripe product ID
  },
  agency: {
    name: "Agency",
    monthlyPriceId: "price_AGENCY_MONTHLY",  // Replace with your actual Stripe price ID
    yearlyPriceId: "price_AGENCY_YEARLY",    // Replace with your actual Stripe price ID
    productId: "prod_AGENCY",                // Replace with your actual Stripe product ID
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly" | "yearly";
