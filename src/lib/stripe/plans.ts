export const TRIAL_DAYS = 14;
export const CURRENCY = "usd";

export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPriceId: "price_1T330cE524oup9rkXd8yIRMD",
    yearlyPriceId: "price_1T330cE524oup9rk9ThXa6CW",
    productId: "prod_PRO",
  },
  agency: {
    name: "Agency",
    monthlyPriceId: "price_1T330VE524oup9rk6E7jpbtd",
    yearlyPriceId: "price_1T330VE524oup9rkoV6iFdnE",
    productId: "prod_AGENCY",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingCycle = "monthly" | "yearly";
