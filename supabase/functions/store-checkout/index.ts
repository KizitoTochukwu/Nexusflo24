// Automation Store checkout: creates the order record and a Stripe Checkout session.
// One-time setup fees are charged in GBP. An optional managed plan is added as a
// monthly subscription with the setup fees attached to the first invoice.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Item {
  kind?: "product" | "bundle";
  slug: string;
  name: string;
  unitPricePence: number;
  quantity?: number;
  configuration?: Record<string, unknown>;
}

interface Body {
  items: Item[];
  plan?: { slug: string; name: string; pricePence: number } | null;
  customer: {
    full_name?: string;
    email: string;
    phone?: string;
    business_name?: string;
    website?: string;
    industry?: string;
    notes?: string;
  };
  workspaceId?: string | null;
  /** Currency the customer chose. Non-Stripe currencies fall back to GBP. */
  currency?: string;
}

const STRIPE_CURRENCIES: Record<string, string> = { GBP: "gbp", USD: "usd", EUR: "eur" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = (await req.json()) as Body;
    const items = (body.items ?? []).filter(
      (i) => i && typeof i.slug === "string" && typeof i.unitPricePence === "number" && i.unitPricePence > 0,
    );
    if (!items.length) throw new Error("Your cart is empty.");
    const email = (body.customer?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("A valid email address is required.");

    // Optional signed-in user
    let userId: string | null = null;
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const monthlyBase = body.plan?.pricePence ?? 0;

    // Resolve the charging currency. Catalogue prices are stored in GBP pence;
    // convert server-side from the live rates table (never trust client amounts).
    const requested = (body.currency ?? "GBP").toUpperCase();
    const currency = STRIPE_CURRENCIES[requested] ? requested : "GBP";
    let fx = 1;
    if (currency !== "GBP") {
      const { data: rateRows } = await supabase
        .from("currency_rates")
        .select("quote, rate")
        .eq("base", "USD")
        .in("quote", ["GBP", currency]);
      const map = new Map((rateRows ?? []).map((r: any) => [r.quote, Number(r.rate)]));
      const gbpRate = map.get("GBP");
      const target = map.get(currency);
      if (gbpRate && target) fx = target / gbpRate;
      else console.warn("[store-checkout] missing FX rate, charging in GBP");
    }
    const stripeCurrency = fx === 1 && currency !== "GBP" ? "gbp" : STRIPE_CURRENCIES[currency];
    const orderCurrency = stripeCurrency === "gbp" ? "GBP" : currency;
    const toCharge = (pence: number) =>
      orderCurrency === "GBP" ? pence : Math.round((pence * fx) / 50) * 50;

    // All stored amounts are in the order's charging currency (minor units).
    const priced = items.map((i) => ({
      ...i,
      quantity: Math.max(1, Math.min(20, i.quantity ?? 1)),
      chargeUnit: toCharge(i.unitPricePence),
    }));
    const oneTimeTotal = priced.reduce((sum, i) => sum + i.chargeUnit * i.quantity, 0);
    const monthlyTotal = toCharge(monthlyBase);

    const { data: order, error: orderErr } = await supabase
      .from("store_orders")
      .insert({
        user_id: userId,
        workspace_id: body.workspaceId ?? null,
        email,
        full_name: body.customer.full_name ?? null,
        phone: body.customer.phone ?? null,
        business_name: body.customer.business_name ?? null,
        website: body.customer.website ?? null,
        industry: body.customer.industry ?? null,
        notes: body.customer.notes ?? null,
        status: "pending",
        currency: orderCurrency,
        subtotal_pence: oneTimeTotal,
        total_pence: oneTimeTotal,
        monthly_total_pence: monthlyTotal,
        plan_slug: body.plan?.slug ?? null,
      })
      .select("id")
      .maybeSingle();
    if (orderErr || !order) throw new Error(orderErr?.message || "Could not create the order.");

    const itemRows = priced.map((i) => ({
      order_id: order.id,
      kind: i.kind ?? "product",
      product_slug: i.kind === "bundle" ? null : i.slug,
      bundle_slug: i.kind === "bundle" ? i.slug : null,
      name: i.name,
      unit_price_pence: i.chargeUnit,
      quantity: i.quantity,
      configuration: i.configuration ?? {},
    }));
    const { error: itemsErr } = await supabase.from("store_order_items").insert(itemRows);
    if (itemsErr) throw new Error(itemsErr.message);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://nexusflo24.lovable.app";
    const successUrl = `${origin}/automations/success?order=${order.id}`;
    const cancelUrl = `${origin}/automations/checkout?cancelled=1`;

    const setupLines = priced.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: stripeCurrency,
        unit_amount: i.chargeUnit,
        product_data: { name: `${i.name} — automation setup` },
      },
    }));

    const metadata = {
      type: "store_order",
      orderId: order.id,
      userId: userId ?? "",
      workspaceId: body.workspaceId ?? "",
    };

    let session: Stripe.Checkout.Session;
    if (body.plan && monthlyTotal > 0) {
      // Subscription mode also accepts one-time line items; they are billed on
      // the first invoice alongside the monthly managed plan.
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        line_items: [
          ...setupLines,
          {
            quantity: 1,
            price_data: {
              currency: stripeCurrency,
              unit_amount: monthlyTotal,
              recurring: { interval: "month" as const },
              product_data: { name: `${body.plan.name} — managed automation plan` },
            },
          },
        ],
        subscription_data: { metadata },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: setupLines,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: { metadata },
      });
    }

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    await supabase
      .from("store_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, orderId: order.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[store-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
