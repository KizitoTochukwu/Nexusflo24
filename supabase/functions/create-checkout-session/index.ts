import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed price IDs (public Stripe identifiers, safe to hardcode)
const ALLOWED_PRICE_IDS = new Set([
  "price_1T9mXPE524oup9rkk8iIwV9V", // Starter Monthly
  "price_1T9mYOE524oup9rkkZdWRQFx", // Starter Yearly
  "price_1T9marE524oup9rkld15YfyQ", // Plus Monthly
  "price_1T9mbVE524oup9rkVF3I4II2", // Plus Yearly
  "price_1T9mcBE524oup9rkNpX4MfLj", // Pro Monthly
  "price_1T9mdJE524oup9rkt4IgzlT6", // Pro Yearly
  "price_1T9mf7E524oup9rkAFzF9Yae", // Enterprise Monthly
  "price_1T9mfeE524oup9rk66YsGrWs", // Enterprise Yearly
]);

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, billingCycle, priceId, workspaceId } = await req.json();
    if (!priceId) throw new Error("Missing priceId");

    // Validate priceId against allowed values
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      throw new Error("Invalid priceId");
    }

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
      metadata: { userId: user.id, plan, billingCycle, priceId, workspaceId: workspaceId || "" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout-session] Error:", msg);
    const safeMessages = ["User not authenticated", "Missing priceId", "Invalid priceId"];
    const clientMsg = safeMessages.includes(msg) ? msg : "Unable to create checkout session.";
    return new Response(JSON.stringify({ error: clientMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
