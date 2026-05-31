import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed price IDs are resolved dynamically from the regional_prices table.
// Any new currency/plan combination an admin adds in the dashboard is accepted automatically.

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, billingCycle, currency = "USD", workspaceId } = await req.json();
    if (!plan || !billingCycle) throw new Error("Missing plan or billingCycle");

    // Look up regional price (currency-specific Stripe price ID).
    const { data: priceRow } = await supabaseClient
      .from("regional_prices")
      .select("stripe_price_id, amount_minor, currency")
      .eq("plan_key", plan)
      .eq("billing_cycle", billingCycle)
      .eq("currency", currency)
      .eq("active", true)
      .maybeSingle();

    let priceId = priceRow?.stripe_price_id;
    // Fallback: if no currency-specific Stripe price exists yet, fall back to USD price.
    if (!priceId) {
      const { data: usdRow } = await supabaseClient
        .from("regional_prices")
        .select("stripe_price_id")
        .eq("plan_key", plan)
        .eq("billing_cycle", billingCycle)
        .eq("currency", "USD")
        .maybeSingle();
      priceId = usdRow?.stripe_price_id ?? undefined;
    }

    if (!priceId) throw new Error("No Stripe price configured for this plan");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      if (!customers.data[0].email) {
        await stripe.customers.update(customerId, { email: user.email });
      }
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
    }

    const origin = req.headers.get("origin") || "https://nexusflo24.lovable.app";
    const successUrl = workspaceId
      ? `${origin}/dashboard/${workspaceId}/overview?checkout=success`
      : `${origin}/dashboard?checkout=success`;

    // Only apply 14-day trial to Starter plan
    const subscriptionData: Record<string, unknown> = {};
    if (plan === "starter") {
      subscriptionData.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      metadata: { userId: user.id, plan, billingCycle, priceId, workspaceId: workspaceId || "", currency },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout-session] Error:", msg);
    const safeMessages = ["User not authenticated", "Missing plan or billingCycle", "No Stripe price configured for this plan"];
    const clientMsg = safeMessages.includes(msg) ? msg : "Unable to create checkout session.";
    return new Response(JSON.stringify({ error: clientMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
