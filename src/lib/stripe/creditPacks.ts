export const CREDIT_PACKS = {
  email: {
    label: "Email Credits",
    credits: 1000,
    price: 5,
    priceId: "price_1TD8KhCvKm9Paj6GuxBTFprN",
    unit: "emails",
  },
  sms: {
    label: "SMS Credits",
    credits: 100,
    price: 5,
    priceId: "price_1TD8MHCvKm9Paj6GPnQcHNSH",
    unit: "messages",
  },
  whatsapp: {
    label: "WhatsApp Credits",
    credits: 100,
    price: 5,
    priceId: "price_1TD8MbCvKm9Paj6GGTS0dqQ3",
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
