import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit pack price IDs are looked up per currency in `regional_prices`
// (plan_key = 'credit_email' | 'credit_sms' | 'credit_whatsapp', cycle = 'one_time').
const CREDITS_PER_PACK: Record<string, number> = { email: 1000, sms: 100, whatsapp: 100 };

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

    const { channel, workspaceId, quantity = 1, currency = "USD" } = await req.json();
    if (!channel || !workspaceId) throw new Error("Missing channel or workspaceId");
    if (!CREDITS_PER_PACK[channel]) throw new Error("Invalid channel. Must be email, sms, or whatsapp.");

    const planKey = `credit_${channel}`;
    let { data: priceRow } = await supabaseClient
      .from("regional_prices")
      .select("stripe_price_id")
      .eq("plan_key", planKey)
      .eq("billing_cycle", "one_time")
      .eq("currency", currency)
      .eq("active", true)
      .maybeSingle();

    if (!priceRow?.stripe_price_id) {
      const { data: usdRow } = await supabaseClient
        .from("regional_prices")
        .select("stripe_price_id")
        .eq("plan_key", planKey)
        .eq("billing_cycle", "one_time")
        .eq("currency", "USD")
        .maybeSingle();
      priceRow = usdRow ?? null;
    }
    const priceId = priceRow?.stripe_price_id;
    if (!priceId) throw new Error("No Stripe price configured for this credit pack");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://nexusflo24.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity }],
      mode: "payment",
      success_url: `${origin}/dashboard/${workspaceId}/settings?tab=usage&purchase=success`,
      cancel_url: `${origin}/dashboard/${workspaceId}/settings?tab=usage&purchase=cancel`,
      metadata: {
        type: "credit_purchase",
        channel,
        credits: String(CREDITS_PER_PACK[channel] * quantity),
        workspaceId,
        userId: user.id,
        currency,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-credit-purchase] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
