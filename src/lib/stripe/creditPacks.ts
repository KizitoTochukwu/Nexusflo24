export const CREDIT_PACKS = {
  email: {
    label: "Email Credits",
    credits: 1000,
    price: 5,
    priceId: "price_1TOfYVE524oup9rkOupWd3vN",
    unit: "emails",
  },
  sms: {
    label: "SMS Credits",
    credits: 100,
    price: 5,
    priceId: "price_1TOfc8E524oup9rkWQWIhwrf",
    unit: "messages",
  },
  whatsapp: {
    label: "WhatsApp Credits",
    credits: 100,
    price: 5,
    priceId: "price_1TOfeBE524oup9rkcPlroL47",
    unit: "messages",
  },
} as const;

export type CreditChannel = keyof typeof CREDIT_PACKS;

export const PLAN_CREDITS: Record<string, { email: number; sms: number; whatsapp: number }> = {
  starter: { email: 1000, sms: 0, whatsapp: 100 },
  plus: { email: 5000, sms: 250, whatsapp: 500 },
  pro: { email: 20000, sms: 1000, whatsapp: 2000 },
  enterprise: { email: 75000, sms: 4000, whatsapp: 6000 },
};
