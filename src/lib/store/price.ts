import { useCallback } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency/config";

/**
 * Store catalogue prices are held in GBP pence. Display converts into the
 * visitor's selected currency, and that same currency is used at checkout for
 * every Stripe-supported currency. NGN is display-only (no Stripe support), so
 * it falls back to GBP for the actual charge.
 */
export function chargeCurrencyFor(currency: CurrencyCode): CurrencyCode {
  return CURRENCIES[currency]?.stripeCode ? currency : "GBP";
}

export function useStorePrice() {
  const { currency, rates } = useCurrency();

  const convertMajor = useCallback(
    (pence: number) => {
      const gbp = pence / 100;
      const gbpRate = rates.GBP || 0.79;
      return currency === "GBP" ? gbp : (gbp / gbpRate) * (rates[currency] ?? 1);
    },
    [currency, rates],
  );

  const format = useCallback(
    (pence: number, opts?: { from?: boolean }) => {
      const amount = convertMajor(pence);
      const meta = CURRENCIES[currency];
      const rounded = currency === "NGN" ? Math.round(amount / 1000) * 1000 : Math.round(amount);
      const value = rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return `${opts?.from ? "From " : ""}${meta?.symbol ?? "£"}${value}`;
    },
    [currency, convertMajor],
  );

  const isConverted = currency !== "GBP";
  /** Currency Stripe will actually charge in (NGN is not supported by Stripe). */
  const chargeCurrency = chargeCurrencyFor(currency);

  return { format, currency, isConverted, chargeCurrency, convertMajor };
}

export function formatGbp(pence: number) {
  return `£${(pence / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatMoney(minor: number, currency: string) {
  const meta = CURRENCIES[currency as CurrencyCode];
  const value = (minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${meta?.symbol ?? "£"}${value}`;
}
