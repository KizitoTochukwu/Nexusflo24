// Paystack webhook — verifies HMAC SHA512 signature, handles charge.success and
// subscription.create/disable/not_renew events. Credits messaging packs and upserts subscriptions.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("Paystack not configured", { status: 503, headers: corsHeaders });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const computed = createHmac("sha512", secret).update(raw).digest("hex");
  if (computed !== signature) {
    console.warn("[paystack-webhook] Invalid signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  try {
    const type = event?.event as string;
    const data = event?.data ?? {};
    const meta = data?.metadata ?? {};
    console.log("[paystack-webhook]", type, data?.reference);

    if (type === "charge.success") {
      const purchaseType = meta?.type;
      const userId = meta?.userId;
      const workspaceId = meta?.workspaceId;
      const currency = (data?.currency || meta?.currency || "NGN").toUpperCase();
      const amountMinor = data?.amount ?? 0;

      if (purchaseType === "credit_purchase" && workspaceId) {
        const channel = meta.channel as string;
        const credits = Number(meta.credits || 0);
        if (credits > 0) {
          await supabase.from("credit_transactions").insert({
            workspace_id: workspaceId,
            channel,
            amount: credits,
            reason: "purchase",
            reference_id: data?.reference ?? null,
            currency,
            amount_minor: amountMinor,
          });
        }
      } else if (purchaseType === "subscription" && userId) {
        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            workspace_id: workspaceId ?? null,
            plan: meta.planKey,
            billing_cycle: meta.billingCycle,
            status: "active",
            provider: "paystack",
            provider_customer_id: data?.customer?.customer_code ?? null,
            provider_subscription_id: data?.reference ?? null,
            currency,
            amount_minor: amountMinor,
            current_period_end: null,
          },
          { onConflict: "user_id" },
        );
      }
    } else if (type === "subscription.create") {
      // Recurring subscription was created/activated
      const customerCode = data?.customer?.customer_code;
      const subscriptionCode = data?.subscription_code;
      const planCode = data?.plan?.plan_code;
      const nextPaymentDate = data?.next_payment_date;
      if (customerCode) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            provider_subscription_id: subscriptionCode,
            current_period_end: nextPaymentDate,
            price_id: planCode,
          })
          .eq("provider", "paystack")
          .eq("provider_customer_id", customerCode);
      }
    } else if (type === "subscription.disable" || type === "subscription.not_renew") {
      const subscriptionCode = data?.subscription_code;
      if (subscriptionCode) {
        await supabase
          .from("subscriptions")
          .update({
            status: type === "subscription.not_renew" ? "active" : "canceled",
            cancel_at_period_end: type === "subscription.not_renew",
          })
          .eq("provider_subscription_id", subscriptionCode);
      }
    } else if (type === "invoice.payment_failed") {
      const customerCode = data?.customer?.customer_code;
      if (customerCode) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("provider", "paystack")
          .eq("provider_customer_id", customerCode);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[paystack-webhook] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
