import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://nexusflo24.lovable.app",
  "https://id-preview--83abe329-97fa-4834-9de4-67adac397517.lovable.app",
  "https://83abe329-97fa-4834-9de4-67adac397517.lovableproject.com",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Build allowed price IDs from environment variables
function getAllowedPriceIds(): Set<string> {
  const ids = new Set<string>();
  const envKeys = [
    "STRIPE_PRICE_STARTER_MONTHLY",
    "STRIPE_PRICE_PLUS_MONTHLY",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_YEARLY",
    "STRIPE_PRICE_ENTERPRISE_MONTHLY",
    "STRIPE_PRICE_AGENCY_MONTHLY",
    "STRIPE_PRICE_AGENCY_YEARLY",
    "STRIPE_PRICE_STARTER_YEARLY",
    "STRIPE_PRICE_PLUS_YEARLY",
    "STRIPE_PRICE_ENTERPRISE_YEARLY",
  ];
  for (const key of envKeys) {
    const val = Deno.env.get(key);
    if (val) ids.add(val);
  }
  return ids;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Validate priceId against allowed values from env
    const allowedPrices = getAllowedPriceIds();
    if (allowedPrices.size > 0 && !allowedPrices.has(priceId)) {
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
