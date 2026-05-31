export type CurrencyCode = "USD" | "GBP" | "EUR" | "NGN";

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  flag: string;
  label: string;
  /** Payment provider used for this currency */
  provider: "stripe" | "paystack";
  /** Stripe currency code (lowercased) — undefined for paystack-only */
  stripeCode?: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  USD: { code: "USD", symbol: "$", locale: "en-US", flag: "🇺🇸", label: "US Dollar", provider: "stripe", stripeCode: "usd" },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", flag: "🇬🇧", label: "British Pound", provider: "stripe", stripeCode: "gbp" },
  EUR: { code: "EUR", symbol: "€", locale: "en-IE", flag: "🇪🇺", label: "Euro", provider: "stripe", stripeCode: "eur" },
  NGN: { code: "NGN", symbol: "₦", locale: "en-NG", flag: "🇳🇬", label: "Nigerian Naira", provider: "paystack" },
};

export const CURRENCY_LIST: CurrencyDef[] = [CURRENCIES.USD, CURRENCIES.GBP, CURRENCIES.EUR, CURRENCIES.NGN];

const EU_COUNTRIES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

export function countryToCurrency(countryCode?: string | null): CurrencyCode {
  if (!countryCode) return "USD";
  const cc = countryCode.toUpperCase();
  if (cc === "GB" || cc === "UK") return "GBP";
  if (cc === "US") return "USD";
  if (cc === "NG") return "NGN";
  if (EU_COUNTRIES.has(cc)) return "EUR";
  return "USD";
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in CURRENCIES;
}

/** Format a major-unit amount (e.g. 15 = $15.00). NGN shows no decimals. */
export function formatPrice(amount: number, currency: CurrencyCode, opts?: { compact?: boolean }): string {
  const def = CURRENCIES[currency];
  const maximumFractionDigits = currency === "NGN" ? 0 : opts?.compact ? 0 : 2;
  const minimumFractionDigits = currency === "NGN" ? 0 : opts?.compact ? 0 : Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(def.locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}

/** Format a minor-unit amount (cents/kobo). */
export function formatMinor(amountMinor: number, currency: CurrencyCode): string {
  const divisor = currency === "NGN" ? 100 : 100; // all four use 2 decimals as minor units
  return formatPrice(amountMinor / divisor, currency);
}
