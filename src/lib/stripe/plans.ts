export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";

export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPriceId: "price_1T4h1KCvKm9Paj6GBs96jHy6",
    yearlyPriceId: "price_1T4h27CvKm9Paj6G8ZvTmFDa",
  },
  agency: {
    name: "Agency",
    monthlyPriceId: "price_1T4h2OCvKm9Paj6G1kflWmD5",
    yearlyPriceId: "price_1T4h2fCvKm9Paj6GqSvHB58N",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly" | "yearly";
