import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log("Signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  log("Event received", { type: event.type, id: event.id });

  // Store event
  await supabase.from("payment_events").upsert({
    event_id: event.id,
    type: event.type,
    payload: event.data.object as unknown,
  }, { onConflict: "event_id" });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || "pro";
        const billingCycle = session.metadata?.billingCycle || "monthly";
        const workspaceId = session.metadata?.workspaceId;
        if (!userId) { log("No userId in metadata"); break; }

        const subId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id;

        let status = "active";
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          status = sub.status;
        }

        // Upsert by workspace_id if available, else by user_id
        if (workspaceId) {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            workspace_id: workspaceId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id,
            stripe_subscription_id: subId,
            plan,
            billing_cycle: billingCycle,
            status,
          }, { onConflict: "user_id" });
        } else {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id,
            stripe_subscription_id: subId,
            plan,
            billing_cycle: billingCycle,
            status,
          }, { onConflict: "user_id" });
        }

        log("Subscription created/updated for user", { userId, plan, status, workspaceId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;

        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existing) {
          await supabase.from("subscriptions").update({
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq("stripe_customer_id", customerId);
          log("Subscription updated", { customerId, status: sub.status });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;

        await supabase.from("subscriptions").update({
          plan: "free",
          status: "canceled",
        }).eq("stripe_customer_id", customerId);
        log("Subscription canceled", { customerId });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;

        await supabase.from("subscriptions").update({
          status: "active",
        }).eq("stripe_customer_id", customerId);
        log("Payment succeeded", { customerId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;

        await supabase.from("subscriptions").update({
          status: "past_due",
        }).eq("stripe_customer_id", customerId);
        log("Payment failed", { customerId });
        break;
      }
    }
  } catch (err) {
    log("Error processing event", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
