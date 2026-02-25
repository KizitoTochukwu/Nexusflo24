import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");

serve(async (req) => {
  // Log every incoming request
  log("Request received", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
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

        // Extract subscription ID — handle both legacy and new API (2025-08-27.basil)
        // In new API, subscription moved to parent.subscription_details.subscription
        let invoiceSubId: string | null = null;
        if (typeof invoice.subscription === "string") {
          invoiceSubId = invoice.subscription;
        } else if ((invoice.subscription as any)?.id) {
          invoiceSubId = (invoice.subscription as any).id;
        } else if ((invoice as any).parent?.subscription_details?.subscription) {
          invoiceSubId = (invoice as any).parent.subscription_details.subscription;
        }
        log("Extracted subscription ID from invoice", { invoiceSubId, customerId });

        // Check if a subscription row already exists for this customer
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          // Existing row — just mark active
          const { error } = await supabase.from("subscriptions").update({
            status: "active",
          }).eq("stripe_customer_id", customerId);
          if (error) log("ERROR on payment_succeeded update", error);
          else log("Payment succeeded, status set to active", { customerId });
        } else {
          // FALLBACK: No subscription row yet — create one from Stripe data
          log("No subscription row found, attempting fallback creation", { customerId });

          const subId = invoiceSubId;

          if (subId) {
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            const priceId = stripeSub.items?.data?.[0]?.price?.id || null;

            // Determine plan from price ID using env vars
            let plan = "pro";
            const agencyMonthly = Deno.env.get("STRIPE_PRICE_AGENCY_MONTHLY");
            const agencyYearly = Deno.env.get("STRIPE_PRICE_AGENCY_YEARLY");
            if (priceId && (priceId === agencyMonthly || priceId === agencyYearly)) {
              plan = "agency";
            }

            const proYearly = Deno.env.get("STRIPE_PRICE_PRO_YEARLY");
            const agencyYearlyAlt = Deno.env.get("STRIPE_PRICE_AGENCY_YEARLY");
            const billingCycle = (priceId === proYearly || priceId === agencyYearlyAlt) ? "yearly" : "monthly";

            // Look up userId: find the Stripe customer email, then match to profiles
            const stripeCustomer = await stripe.customers.retrieve(customerId);
            const customerEmail = (stripeCustomer as any).email;
            let userId: string | null = null;

            if (customerEmail) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", customerEmail)
                .maybeSingle();
              userId = profile?.id || null;
            }

            if (!userId) {
              // Also check checkout session metadata as last resort
              const sessions = await stripe.checkout.sessions.list({
                subscription: subId,
                limit: 1,
              });
              if (sessions.data.length > 0) {
                userId = sessions.data[0].metadata?.userId || null;
              }
            }

            if (userId) {
              const { error: upsertErr } = await supabase.from("subscriptions").upsert({
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subId,
                plan,
                billing_cycle: billingCycle,
                status: stripeSub.status,
                price_id: priceId,
                current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
              }, { onConflict: "user_id" });

              if (upsertErr) {
                log("ERROR fallback subscription upsert", upsertErr);
              } else {
                log("Fallback subscription created", { userId, plan, status: stripeSub.status });
              }
            } else {
              log("WARNING: Could not determine userId for fallback", { customerId, customerEmail });
            }
          } else {
            log("No subscription ID on invoice, skipping fallback", { customerId });
          }
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
