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
  starter: { email: 500, sms: 0, whatsapp: 0 },
  plus: { email: 2500, sms: 100, whatsapp: 100 },
  pro: { email: 10000, sms: 500, whatsapp: 500 },
  enterprise: { email: 50000, sms: 2000, whatsapp: 2000 },
};
