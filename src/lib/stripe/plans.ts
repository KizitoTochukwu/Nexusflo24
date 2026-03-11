export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";

export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPriceId: "price_1T9bcOCvKm9Paj6GxlTolt4h",
  },
  plus: {
    name: "Plus",
    monthlyPriceId: "price_1T9bcnCvKm9Paj6GpHVLemoS",
  },
  pro: {
    name: "Pro",
    monthlyPriceId: "price_1T9bdICvKm9Paj6GJAwLkNMW",
  },
  enterprise: {
    name: "Enterprise",
    monthlyPriceId: "price_1T9bdnCvKm9Paj6GslqdiDIe",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly";
