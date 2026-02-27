import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");

serve(async (req) => {
  // Log incoming request (omit sensitive headers)
  log("Request received", {
    method: req.method,
    url: req.url,
  });

  // Detect Stripe mode
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (stripeKey.startsWith("sk_test_")) {
    log("Running in Stripe TEST mode");
  } else if (stripeKey.startsWith("sk_live_")) {
    log("Running in Stripe LIVE mode");
  } else {
    log("WARNING: Could not determine Stripe mode from key prefix");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("ERROR: Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  log("Raw body length", { length: body.length });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    // CRITICAL: Use SubtleCryptoProvider for Deno environment
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
    log("Signature verification: SUCCESS", { eventId: event.id, eventType: event.type });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("Signature verification: FAILED", { error: errMsg });
    return new Response(`Invalid signature: ${errMsg}`, { status: 400 });
  }

  // Store raw event
  const { error: insertError } = await supabase.from("payment_events").upsert({
    event_id: event.id,
    type: event.type,
    payload: event.data.object as unknown,
  }, { onConflict: "event_id" });

  if (insertError) {
    log("ERROR inserting payment_event", insertError);
  } else {
    log("payment_event stored", { eventId: event.id });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || "pro";
        const billingCycle = session.metadata?.billingCycle || "monthly";
        const workspaceId = session.metadata?.workspaceId || null;

        if (!userId) {
          log("WARNING: No userId in checkout session metadata");
          break;
        }

        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as any)?.id;

        let subId: string | null = null;
        if (typeof session.subscription === "string") {
          subId = session.subscription;
        } else if ((session.subscription as any)?.id) {
          subId = (session.subscription as any).id;
        }
        log("Checkout session subscription ID", { subId });

        let status = "active";
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          status = sub.status;
        }

        const priceId = session.metadata?.priceId || null;

        const upsertData = {
          user_id: userId,
          workspace_id: workspaceId || null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          plan,
          billing_cycle: billingCycle,
          status,
          price_id: priceId,
        };

        const { error: upsertErr } = await supabase
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "user_id" });

        if (upsertErr) {
          log("ERROR upserting subscription", upsertErr);
        } else {
          log("Subscription created/updated", { userId, plan, status, workspaceId });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : (sub.customer as any)?.id;

        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabase.from("subscriptions").update({
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            stripe_subscription_id: sub.id,
          }).eq("stripe_customer_id", customerId);

          if (updateErr) {
            log("ERROR updating subscription", updateErr);
          } else {
            log("Subscription updated", { customerId, status: sub.status, event: event.type });
          }
        } else {
          log("No existing subscription found for customer", { customerId, event: event.type });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : (sub.customer as any)?.id;

        const { error: delErr } = await supabase.from("subscriptions").update({
          plan: "free",
          status: "canceled",
        }).eq("stripe_customer_id", customerId);

        if (delErr) {
          log("ERROR canceling subscription", delErr);
        } else {
          log("Subscription canceled", { customerId });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          const { error } = await supabase.from("subscriptions").update({
            status: "active",
          }).eq("stripe_customer_id", customerId);
          if (error) log("ERROR on payment_succeeded update", error);
          else log("Payment succeeded, status set to active", { customerId });
        } else {
          log("No subscription row found for customer, skipping", { customerId });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

        const { error } = await supabase.from("subscriptions").update({
          status: "past_due",
        }).eq("stripe_customer_id", customerId);

        if (error) log("ERROR on payment_failed", error);
        else log("Payment failed, status set to past_due", { customerId });
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("ERROR processing event", { error: errMsg, eventType: event.type });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
