import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CURRENCIES, countryToCurrency, isCurrencyCode, type CurrencyCode } from "@/lib/currency/config";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  /** Convert a USD major-unit amount to the active currency (display only). */
  convert: (usdAmount: number) => number;
  /** Convert a USD minor-unit amount to active-currency minor units. */
  convertMinor: (usdMinor: number) => number;
  loading: boolean;
}

const DEFAULT_RATES: Record<CurrencyCode, number> = { USD: 1, GBP: 0.79, EUR: 0.92, NGN: 1600 };
const LS_KEY = "nf24:currency";
const LS_GEO_KEY = "nf24:geo";
const GEO_TTL_MS = 24 * 60 * 60 * 1000;

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);

  // Load rates from DB once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("currency_rates").select("quote, rate").eq("base", "USD");
      if (data && data.length) {
        const next = { ...DEFAULT_RATES };
        for (const row of data) {
          if (isCurrencyCode(row.quote)) next[row.quote as CurrencyCode] = Number(row.rate);
        }
        setRates(next);
      }
    })();
  }, []);

  // Initial detection: profile → localStorage → geo → fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Profile preference (authed users)
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_currency")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && data?.preferred_currency && isCurrencyCode(data.preferred_currency)) {
          setCurrencyState(data.preferred_currency as CurrencyCode);
          setDetected(true);
          setLoading(false);
          return;
        }
      }

      // 2. localStorage
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (stored && isCurrencyCode(stored)) {
        if (!cancelled) {
          setCurrencyState(stored as CurrencyCode);
          setDetected(true);
          setLoading(false);
          return;
        }
      }

      // 3. Geo-IP
      try {
        const cachedRaw = typeof window !== "undefined" ? window.localStorage.getItem(LS_GEO_KEY) : null;
        let countryCode: string | null = null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Date.now() - cached.t < GEO_TTL_MS) countryCode = cached.cc;
        }
        if (!countryCode) {
          const resp = await fetch("https://ipapi.co/json/", { cache: "no-store" });
          if (resp.ok) {
            const json = await resp.json();
            countryCode = json?.country_code || json?.country || null;
            if (typeof window !== "undefined" && countryCode) {
              window.localStorage.setItem(LS_GEO_KEY, JSON.stringify({ cc: countryCode, t: Date.now() }));
            }
          }
        }
        if (!cancelled) {
          const detectedCode = countryToCurrency(countryCode);
          setCurrencyState(detectedCode);
        }
      } catch {
        // Network blocked → silently keep USD default
      } finally {
        if (!cancelled) {
          setDetected(true);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try { window.localStorage.setItem(LS_KEY, next); } catch {}
    if (user) {
      supabase
        .from("profiles")
        .update({ preferred_currency: next })
        .eq("id", user.id)
        .then(() => {});
    }
  }, [user]);

  const convert = useCallback((usdAmount: number) => {
    const rate = rates[currency] ?? 1;
    const converted = usdAmount * rate;
    if (currency === "NGN") return Math.round(converted);
    return Math.round(converted * 100) / 100;
  }, [currency, rates]);

  const convertMinor = useCallback((usdMinor: number) => {
    const rate = rates[currency] ?? 1;
    return Math.round(usdMinor * rate);
  }, [currency, rates]);

  const value = useMemo(() => ({ currency, setCurrency, rates, convert, convertMinor, loading: loading && !detected }), [currency, setCurrency, rates, convert, convertMinor, loading, detected]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export { CURRENCIES };
