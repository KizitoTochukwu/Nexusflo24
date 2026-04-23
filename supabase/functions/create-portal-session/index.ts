import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://nexusflo24.lovable.app",
  "https://nexusflo24.com",
  "https://www.nexusflo24.com",
  "https://id-preview--83abe329-97fa-4834-9de4-67adac397517.lovable.app",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isLovablePreview = /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin);
  const allowed = allowedOrigins.includes(origin) || isLovablePreview;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

const log = (step: string, details?: unknown) =>
  console.log(`[create-portal-session] ${step}`, details ? JSON.stringify(details) : "");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Billing is not configured. Please contact support." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user?.email) {
      log("Auth failed", authError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    log("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Prefer the customer ID stored on our subscription row — most reliable across modes/emails.
    let customerId: string | null = null;
    const { data: sub } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
      log("Found customer from subscriptions table", { customerId });
    } else {
      // Fallback: look up by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        log("Found customer by email", { customerId });
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({
          error: "No billing account found. Subscribe to a plan first to manage billing.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const origin = req.headers.get("origin") || "https://nexusflo24.com";

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard?billing=return`,
      });
    } catch (stripeErr: any) {
      const msg = stripeErr?.message || String(stripeErr);
      log("Stripe portal error", { message: msg, code: stripeErr?.code, type: stripeErr?.type });

      // Most common: portal not configured in Stripe Dashboard.
      if (
        msg.includes("No configuration provided") ||
        msg.includes("default configuration has not been created") ||
        msg.includes("customer portal")
      ) {
        return new Response(
          JSON.stringify({
            error:
              "The Stripe Customer Portal hasn't been activated yet. An admin must enable it at https://dashboard.stripe.com/settings/billing/portal (use the same mode — test or live — as your secret key).",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ error: `Stripe error: ${msg}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    log("Portal session created", { sessionId: portalSession.id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("[create-portal-session] Unexpected error:", msg);
    return new Response(JSON.stringify({ error: msg || "Unable to process request" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
