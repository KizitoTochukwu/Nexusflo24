import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_ROI_CALCULATOR_SETTINGS,
  type Currency,
  type RoiCalculatorSettings,
} from "@/lib/roi/calculator";

const CURRENCIES: Currency[] = ["GBP", "USD", "EUR", "NGN"];

function coerceThresholds(
  raw: unknown,
  fallback: Record<Currency, number>,
): Record<Currency, number> {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...fallback };
  for (const c of CURRENCIES) {
    const v = src[c];
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    if (Number.isFinite(n) && n >= 0) out[c] = n;
  }
  return out;
}

export function useRoiCalculatorSettings() {
  return useQuery({
    queryKey: ["roi-calculator-settings"],
    queryFn: async (): Promise<RoiCalculatorSettings> => {
      const { data, error } = await supabase.rpc("get_roi_calculator_settings" as never);
      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return DEFAULT_ROI_CALCULATOR_SETTINGS;
      }
      const row = data[0] as {
        booking_url: string | null;
        high_opportunity_thresholds: unknown;
        high_admin_thresholds: unknown;
      };
      return {
        booking_url: row.booking_url || DEFAULT_ROI_CALCULATOR_SETTINGS.booking_url,
        high_opportunity_thresholds: coerceThresholds(
          row.high_opportunity_thresholds,
          DEFAULT_ROI_CALCULATOR_SETTINGS.high_opportunity_thresholds,
        ),
        high_admin_thresholds: coerceThresholds(
          row.high_admin_thresholds,
          DEFAULT_ROI_CALCULATOR_SETTINGS.high_admin_thresholds,
        ),
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_ROI_CALCULATOR_SETTINGS,
  });
}
