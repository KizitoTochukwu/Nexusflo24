import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { allocatePlanCredits, addCredits } from "../_shared/credit-guard.ts";
import type { CreditChannel } from "../_shared/credit-guard.ts";

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

        // Handle credit pack purchases (one-time payments)
        if (session.metadata?.type === "credit_purchase") {
          const channel = session.metadata.channel as CreditChannel;
          const credits = parseInt(session.metadata.credits || "0", 10);
          const wsId = session.metadata.workspaceId;

          if (channel && credits > 0 && wsId) {
            await addCredits(wsId, channel, credits, "purchase", session.id);
            log("Credit purchase fulfilled", { channel, credits, workspaceId: wsId });
          } else {
            log("WARNING: Invalid credit purchase metadata", session.metadata);
          }
          break;
        }

        // Handle Automation Store orders (setup fees, optional managed plan)
        if (session.metadata?.type === "store_order") {
          const orderId = session.metadata.orderId;
          if (!orderId) {
            log("WARNING: store order session without orderId", session.metadata);
            break;
          }

          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id ?? null;

          await supabase
            .from("store_orders")
            .update({
              status: "awaiting_onboarding",
              paid_at: new Date().toISOString(),
              stripe_payment_intent: paymentIntentId,
            })
            .eq("id", orderId);

          const { data: order } = await supabase
            .from("store_orders")
            .select("id, user_id, workspace_id")
            .eq("id", orderId)
            .maybeSingle();

          const { data: orderItems } = await supabase
            .from("store_order_items")
            .select("id, name, product_slug, bundle_slug, configuration")
            .eq("order_id", orderId);

          const { data: existing } = await supabase
            .from("store_projects")
            .select("id")
            .eq("order_id", orderId)
            .limit(1);

          if (!existing?.length && orderItems?.length) {
            const projects = orderItems.map((item) => ({
              order_id: orderId,
              order_item_id: item.id,
              user_id: order?.user_id ?? null,
              workspace_id: order?.workspace_id ?? null,
              name: item.name,
              product_slug: item.product_slug,
              bundle_slug: item.bundle_slug,
              status: "onboarding",
              progress: 10,
              configuration: item.configuration ?? {},
            }));
            const { data: created, error: projErr } = await supabase
              .from("store_projects")
              .insert(projects)
              .select("id");
            if (projErr) log("ERROR creating store projects", projErr);

            if (created?.length) {
              await supabase.from("store_project_updates").insert(
                created.map((p) => ({
                  project_id: p.id,
                  title: "Order confirmed",
                  body: "Payment received. Complete your onboarding so our team can start the build.",
                  update_type: "status",
                })),
              );
            }
          }

          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/store-notify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ event: "order_paid", order_id: orderId }),
            });
            for (const ev of ["onboarding_invite", "admin_new_order"]) {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/store-notify`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ event: ev, order_id: orderId }),
              });
            }
          } catch (notifyErr) {
            log("WARNING: store-notify failed", notifyErr);
          }

          log("Store order fulfilled", { orderId });
          break;
        }

        // Handle subscription checkout
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

        // Allocate plan-included credits
        if (workspaceId) {
          await allocatePlanCredits(workspaceId, plan, session.id);
          log("Plan credits allocated", { workspaceId, plan });
        }

        // Check for referral conversion
        try {
          const { data: referral } = await supabase
            .from("referrals")
            .select("id, referrer_user_id, workspace_id")
            .eq("referred_user_id", userId)
            .eq("status", "signed_up")
            .maybeSingle();

          if (referral) {
            const rewardCredits = 500;
            await supabase.from("referrals").update({
              status: "converted",
              reward_credits: rewardCredits,
              converted_at: new Date().toISOString(),
            }).eq("id", referral.id);

            // Credit referrer's workspace
            if (referral.workspace_id) {
              await addCredits(referral.workspace_id, "email", rewardCredits, "referral_reward", referral.id);
            }
            log("Referral converted", { referralId: referral.id, rewardCredits });
          }
        } catch (refErr) {
          log("Referral conversion check failed (non-fatal)", refErr);
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
          plan: "starter",
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
          .select("id, plan, workspace_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          const { error } = await supabase.from("subscriptions").update({
            status: "active",
          }).eq("stripe_customer_id", customerId);
          if (error) log("ERROR on payment_succeeded update", error);
          else log("Payment succeeded, status set to active", { customerId });

          // Allocate monthly credits on renewal
          if (existingSub.workspace_id && existingSub.plan) {
            await allocatePlanCredits(existingSub.workspace_id, existingSub.plan, `renewal_${event.id}`);
            log("Renewal credits allocated", { workspaceId: existingSub.workspace_id, plan: existingSub.plan });
          }
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
