import { useCallback } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/currency/config";

/**
 * Store catalogue prices are held in GBP pence. Display converts into the
 * visitor's selected currency for guidance; GBP remains the charging currency.
 */
export function useStorePrice() {
  const { currency, rates } = useCurrency();

  const format = useCallback(
    (pence: number, opts?: { from?: boolean }) => {
      const gbp = pence / 100;
      const gbpRate = rates.GBP || 0.79;
      const amount = currency === "GBP" ? gbp : (gbp / gbpRate) * (rates[currency] ?? 1);
      const meta = CURRENCIES[currency];
      const rounded = currency === "NGN" ? Math.round(amount / 1000) * 1000 : Math.round(amount);
      const value = rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return `${opts?.from ? "From " : ""}${meta?.symbol ?? "£"}${value}`;
    },
    [currency, rates],
  );

  const isConverted = currency !== "GBP";

  return { format, currency, isConverted };
}

export function formatGbp(pence: number) {
  return `£${(pence / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
