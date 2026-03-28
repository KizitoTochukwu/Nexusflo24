export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";
export const YEARLY_DISCOUNT = 0.2; // 20% off

export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 15,
    monthlyPriceId: "price_1T9mXPE524oup9rkk8iIwV9V",
    yearlyPriceId: "price_1T9mYOE524oup9rkkZdWRQFx",
  },
  plus: {
    name: "Plus",
    monthlyPrice: 39,
    monthlyPriceId: "price_1T9marE524oup9rkld15YfyQ",
    yearlyPriceId: "price_1T9mbVE524oup9rkVF3I4II2",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 79,
    monthlyPriceId: "price_1T9bdICvKm9Paj6GJAwLkNMW",
    yearlyPriceId: "price_1T9bwOCvKm9Paj6GuvLk2302",
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 199,
    monthlyPriceId: "price_1T9bdnCvKm9Paj6GslqdiDIe",
    yearlyPriceId: "price_1T9bwrCvKm9Paj6GvFJKQrSl",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly" | "yearly";

/** Effective monthly price for a given cycle */
export function getDisplayPrice(monthlyPrice: number, cycle: BillingCycle): number {
  return cycle === "yearly" ? Math.round(monthlyPrice * (1 - YEARLY_DISCOUNT)) : monthlyPrice;
}

/** Annual total for yearly billing */
export function getYearlyTotal(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT));
}

/** Annual savings compared to monthly billing */
export function getYearlySavings(monthlyPrice: number): number {
  return monthlyPrice * 12 - getYearlyTotal(monthlyPrice);
}
