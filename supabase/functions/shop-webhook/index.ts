// Stripe Connect webhook for workspace storefronts.
// Marks orders paid, records transactions, decrements stock and fires notifications.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient, logCommerceEvent } from "../_shared/shop.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[SHOP-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");

async function notify(event: string, orderId: string, extra: Record<string, unknown> = {}) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/shop-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ event, order_id: orderId, ...extra }),
    });
  } catch (err) {
    log("notify failed", String(err));
  }
}

serve(async (req) => {
  const admin = adminClient();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const secret = Deno.env.get("STRIPE_SHOP_WEBHOOK_SECRET");
  if (!secret) {
    log("ERROR: STRIPE_SHOP_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    log("signature verification failed", String(err));
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: skip events already handled.
  const { error: dupErr } = await admin
    .from("processed_webhook_events")
    .insert({ event_id: event.id, source: "stripe_connect", event_type: event.type });
  if (dupErr) {
    log("duplicate event ignored", { id: event.id });
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type !== "shop_order") break;
        const orderId = session.metadata.order_id;
        if (!orderId) break;

        const { data: order } = await admin.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
        if (!order || order.status === "paid") break;

        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as any)?.id ?? null;
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id ?? null;

        await admin.from("shop_orders").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          stripe_subscription_id: subscriptionId,
        }).eq("id", orderId);

        await admin.from("shop_order_status_history").insert({
          workspace_id: order.workspace_id,
          order_id: orderId,
          from_status: order.status,
          to_status: "paid",
          source: "stripe",
        });

        await admin.from("shop_transactions").insert({
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          order_id: orderId,
          type: "payment",
          status: "succeeded",
          currency: order.currency,
          amount: session.amount_total ?? order.total_amount,
          stripe_object_id: paymentIntentId ?? session.id,
        });

        // Stock movements
        const { data: items } = await admin
          .from("shop_order_items")
          .select("product_id, variant_id, quantity")
          .eq("order_id", orderId);
        for (const item of items ?? []) {
          if (item.variant_id) {
            const { data: v } = await admin
              .from("shop_product_variants")
              .select("inventory_quantity")
              .eq("id", item.variant_id)
              .maybeSingle();
            if (v) {
              await admin.from("shop_product_variants")
                .update({ inventory_quantity: v.inventory_quantity - item.quantity })
                .eq("id", item.variant_id);
            }
          } else if (item.product_id) {
            const { data: p } = await admin
              .from("shop_products")
              .select("track_inventory, inventory_quantity")
              .eq("id", item.product_id)
              .maybeSingle();
            if (p?.track_inventory) {
              await admin.from("shop_products")
                .update({ inventory_quantity: p.inventory_quantity - item.quantity })
                .eq("id", item.product_id);
            }
          }
          await admin.from("shop_inventory_movements").insert({
            workspace_id: order.workspace_id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            delta: -item.quantity,
            reason: "sale",
            reference: orderId,
          });
        }

        // Customer rollup
        if (order.customer_id) {
          const { data: c } = await admin
            .from("shop_customers")
            .select("total_orders, total_spent")
            .eq("id", order.customer_id)
            .maybeSingle();
          await admin.from("shop_customers").update({
            total_orders: (c?.total_orders ?? 0) + 1,
            total_spent: (c?.total_spent ?? 0) + order.total_amount,
            last_order_at: new Date().toISOString(),
          }).eq("id", order.customer_id);
        }

        // Discount redemption
        if (order.discount_code) {
          const { data: d } = await admin
            .from("shop_discounts")
            .select("id, redemption_count")
            .eq("store_id", order.store_id)
            .eq("code", order.discount_code)
            .maybeSingle();
          if (d) {
            await admin.from("shop_discounts")
              .update({ redemption_count: (d.redemption_count ?? 0) + 1 })
              .eq("id", d.id);
          }
        }

        await logCommerceEvent(admin, {
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          event_type: "order_paid",
          order_id: orderId,
          customer_id: order.customer_id,
          payload: { total: order.total_amount, currency: order.currency },
        });

        // ---- Phase 5: CRM sync, timeline + commerce automation triggers ----
        {
          const { data: fullItems } = await admin
            .from("shop_order_items")
            .select("product_id, title, quantity, total_amount")
            .eq("order_id", orderId);
          const productIds = (fullItems ?? []).map((i: any) => i.product_id).filter(Boolean);
          const isSubscription = Boolean(subscriptionId);
          const { count: priorOrders } = await admin
            .from("shop_orders")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", order.workspace_id)
            .eq("status", "paid")
            .ilike("email", order.email ?? "")
            .neq("id", orderId);

          const crm = await handleCommerceEvent(admin, {
            party: {
              workspace_id: order.workspace_id,
              store_id: order.store_id,
              email: order.email,
              full_name: order.full_name,
              phone: order.phone,
              customer_id: order.customer_id,
              order_id: orderId,
            },
            event_type: "order_paid",
            title: `Order ${order.order_number} paid`,
            description: (fullItems ?? []).map((i: any) => `${i.quantity} × ${i.title}`).join(", ") || null,
            status: "paid",
            external_event_id: `order_paid:${orderId}`,
            meta: {
              order_id: orderId,
              order_number: order.order_number,
              total: order.total_amount,
              currency: order.currency,
              items: fullItems ?? [],
            },
            event_config: { product_ids: productIds, is_subscription: isSubscription },
          });

          if ((priorOrders ?? 0) === 0) {
            await fireCommerceTrigger({
              workspace_id: order.workspace_id,
              lead_id: crm.lead_id,
              event_type: "first_order_placed",
              event_config: {
                store_id: order.store_id,
                order_id: orderId,
                product_ids: productIds,
                external_event_id: `first_order:${orderId}`,
              },
            });
          }
          if (isSubscription) {
            await fireCommerceTrigger({
              workspace_id: order.workspace_id,
              lead_id: crm.lead_id,
              event_type: "subscription_started",
              event_config: {
                store_id: order.store_id,
                order_id: orderId,
                product_ids: productIds,
                external_event_id: `sub_started:${orderId}`,
              },
            });
          }
        }

        await notify("order_paid", orderId);
        await notify("seller_new_order", orderId);
        log("order paid", { orderId });
        break;
      }


      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as any;
        const orderId = obj.metadata?.order_id;
        if (!orderId) break;
        const { data: order } = await admin
          .from("shop_orders")
          .select("id, workspace_id, store_id, status, currency")
          .eq("id", orderId)
          .maybeSingle();
        if (!order || order.status === "paid") break;
        await admin.from("shop_orders").update({ status: "failed" }).eq("id", orderId);
        await admin.from("shop_order_status_history").insert({
          workspace_id: order.workspace_id,
          order_id: orderId,
          from_status: order.status,
          to_status: "failed",
          source: "stripe",
        });
        log("order failed", { orderId, type: event.type });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (!paymentIntentId) break;
        const { data: order } = await admin
          .from("shop_orders")
          .select("id, workspace_id, store_id, currency, total_amount, status, email, full_name, phone, customer_id, order_number")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (!order) break;
        const refunded = charge.amount_refunded ?? 0;
        await admin.from("shop_orders").update({
          refunded_amount: refunded,
          status: refunded >= order.total_amount ? "refunded" : "partially_refunded",
        }).eq("id", order.id);
        await admin.from("shop_transactions").insert({
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          order_id: order.id,
          type: "refund",
          status: "succeeded",
          currency: order.currency,
          amount: refunded,
          stripe_object_id: charge.id,
        });
        await logCommerceEvent(admin, {
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          event_type: "order_refunded",
          order_id: order.id,
          payload: { refunded },
        });
        await handleCommerceEvent(admin, {
          party: {
            workspace_id: order.workspace_id,
            store_id: order.store_id,
            email: order.email,
            full_name: order.full_name,
            phone: order.phone,
            customer_id: order.customer_id,
            order_id: order.id,
          },
          event_type: "order_refunded",
          title: `Order ${order.order_number} refunded`,
          description: `${(refunded / 100).toFixed(2)} ${String(order.currency).toUpperCase()} refunded`,
          status: refunded >= order.total_amount ? "refunded" : "partially_refunded",
          external_event_id: `order_refunded:${order.id}:${charge.id}`,
          meta: { order_id: order.id, refunded, currency: order.currency },
        });
        log("order refunded", { orderId: order.id, refunded });
        break;
      }


      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : null;
        if (!subscriptionId) break;
        const { data: order } = await admin
          .from("shop_orders")
          .select("id, workspace_id, store_id, currency, customer_id, email, full_name, phone, order_number")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        if (!order) break;
        await admin.from("shop_transactions").insert({
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          order_id: order.id,
          type: "subscription_payment",
          status: "succeeded",
          currency: order.currency,
          amount: invoice.amount_paid ?? 0,
          stripe_object_id: invoice.id,
        });
        await logCommerceEvent(admin, {
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          event_type: "subscription_renewed",
          order_id: order.id,
          customer_id: order.customer_id,
          payload: { amount: invoice.amount_paid },
        });
        await handleCommerceEvent(admin, {
          party: {
            workspace_id: order.workspace_id,
            store_id: order.store_id,
            email: order.email,
            full_name: order.full_name,
            phone: order.phone,
            customer_id: order.customer_id,
            order_id: order.id,
          },
          event_type: "subscription_renewed",
          title: "Subscription payment received",
          description: `${((invoice.amount_paid ?? 0) / 100).toFixed(2)} ${String(order.currency).toUpperCase()} for order ${order.order_number}`,
          status: "paid",
          external_event_id: `sub_renewed:${invoice.id}`,
          meta: { order_id: order.id, amount: invoice.amount_paid, currency: order.currency },
        });
        break;
      }


      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: order } = await admin
          .from("shop_orders")
          .select("id, workspace_id, store_id, customer_id, email, full_name, phone, order_number")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        if (!order) break;
        // Subscription lifecycle: end access bought through this plan
        await admin
          .from("shop_entitlements")
          .update({
            status: "revoked",
            revoked_at: new Date().toISOString(),
            revoke_reason: "subscription_cancelled",
          })
          .eq("stripe_subscription_id", sub.id)
          .eq("status", "active");
        await admin
          .from("shop_community_members")
          .update({ status: "suspended" })
          .eq("order_id", order.id)
          .eq("status", "active");
        await logCommerceEvent(admin, {
          workspace_id: order.workspace_id,
          store_id: order.store_id,
          event_type: "subscription_cancelled",
          order_id: order.id,
          customer_id: order.customer_id,
          payload: {},
        });
        await handleCommerceEvent(admin, {
          party: {
            workspace_id: order.workspace_id,
            store_id: order.store_id,
            email: order.email,
            full_name: order.full_name,
            phone: order.phone,
            customer_id: order.customer_id,
            order_id: order.id,
          },
          event_type: "subscription_cancelled",
          title: "Subscription cancelled",
          description: `Access from order ${order.order_number} was revoked`,
          status: "cancelled",
          external_event_id: `sub_cancelled:${sub.id}`,
          meta: { order_id: order.id, stripe_subscription_id: sub.id },
        });
        break;

      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await admin.from("seller_payment_accounts").update({
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
          details_submitted: Boolean(account.details_submitted),
          default_currency: account.default_currency ?? null,
          country: account.country ?? null,
          last_synced_at: new Date().toISOString(),
        }).eq("stripe_account_id", account.id);
        log("seller account synced", { account: account.id });
        break;
      }

      default:
        log("unhandled event", { type: event.type });
    }
  } catch (err) {
    log("ERROR processing event", { type: event.type, error: err instanceof Error ? err.message : String(err) });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
