// Opens a Stripe billing portal session on the seller's connected account so a
// shopper can manage the subscription that came from one of their orders.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient, callerUserId, corsHeaders, json, SITE_URL } from "../_shared/shop.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = adminClient();
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || "");
    const email = String(body.email || "").trim().toLowerCase();
    if (!orderId) return json({ error: "orderId is required." }, 400);

    const { data: order } = await admin
      .from("shop_orders")
      .select("id, user_id, email, status, store_id, workspace_id, stripe_subscription_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);

    const userId = await callerUserId(req, admin);
    const owns = (userId && order.user_id === userId) ||
      (!!email && email === String(order.email).toLowerCase());
    if (!owns) return json({ error: "You do not have access to this order." }, 403);

    if (!order.stripe_subscription_id) {
      return json({ error: "This order does not include a recurring plan." }, 400);
    }

    const { data: store } = await admin
      .from("shop_stores")
      .select("id, slug")
      .eq("id", order.store_id)
      .maybeSingle();

    const { data: account } = await admin
      .from("seller_payment_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("workspace_id", order.workspace_id)
      .maybeSingle();
    if (!account?.stripe_account_id) {
      return json({ error: "This store is not connected to Stripe." }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const subscription = await stripe.subscriptions.retrieve(
      order.stripe_subscription_id,
      { stripeAccount: account.stripe_account_id },
    );
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer as any)?.id;
    if (!customerId) return json({ error: "No billing profile found for this plan." }, 400);

    const origin = req.headers.get("origin") || SITE_URL;
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: `${origin}/s/${store?.slug ?? ""}/order/${order.id}`,
      },
      { stripeAccount: account.stripe_account_id },
    );

    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shop-customer-portal] error", message);
    return json({ error: message }, 500);
  }
});
