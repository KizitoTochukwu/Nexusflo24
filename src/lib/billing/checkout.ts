import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency/config";
import type { PlanKey, BillingCycle } from "@/lib/stripe/plans";

interface StartCheckoutOpts {
  planKey: PlanKey;
  billingCycle: BillingCycle;
  currency: CurrencyCode;
  workspaceId?: string;
}

export interface CheckoutResult {
  url: string;
  provider: "stripe" | "paystack";
}

/**
 * Start a subscription checkout. Routes to Stripe (USD/GBP/EUR) or Paystack (NGN)
 * based on currency. Returns the hosted checkout URL.
 */
export async function startSubscriptionCheckout(opts: StartCheckoutOpts): Promise<CheckoutResult> {
  const { planKey, billingCycle, currency, workspaceId } = opts;
  const def = CURRENCIES[currency];

  if (def.provider === "paystack") {
    const { data, error } = await supabase.functions.invoke("paystack-checkout", {
      body: {
        mode: "subscription",
        planKey,
        billingCycle,
        currency,
        workspaceId,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error || "Paystack is not configured yet.");
    return { url: data.url, provider: "paystack" };
  }

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan: planKey, billingCycle, currency, workspaceId },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("No checkout URL returned");
  return { url: data.url, provider: "stripe" };
}

interface CreditCheckoutOpts {
  channel: "email" | "sms" | "whatsapp";
  quantity: number;
  currency: CurrencyCode;
  workspaceId: string;
}

export async function startCreditCheckout(opts: CreditCheckoutOpts): Promise<CheckoutResult> {
  const def = CURRENCIES[opts.currency];
  if (def.provider === "paystack") {
    const { data, error } = await supabase.functions.invoke("paystack-checkout", {
      body: { mode: "credits", ...opts },
    });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error || "Paystack is not configured yet.");
    return { url: data.url, provider: "paystack" };
  }

  const { data, error } = await supabase.functions.invoke("create-credit-purchase", {
    body: opts,
  });
  if (error) throw error;
  if (!data?.url) throw new Error("No checkout URL returned");
  return { url: data.url, provider: "stripe" };
}
