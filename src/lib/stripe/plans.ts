export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";

export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPriceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || "price_1T330cE524oup9rkXd8yIRMD",
    yearlyPriceId: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || "price_1T330cE524oup9rk9ThXa6CW",
  },
  agency: {
    name: "Agency",
    monthlyPriceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY_MONTHLY || "price_1T330VE524oup9rk6E7jpbtd",
    yearlyPriceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY_YEARLY || "price_1T330VE524oup9rkoV6iFdnE",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly" | "yearly";
