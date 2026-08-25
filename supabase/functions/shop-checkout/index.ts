// Storefront checkout: prices every line server-side, records a pending order and
// opens a Stripe Checkout Session on the seller's own connected Stripe account.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  adminClient,
  callerUserId,
  corsHeaders,
  json,
  logCommerceEvent,
  orderNumber,
  SITE_URL,
  stripeCurrency,
} from "../_shared/shop.ts";

interface LineInput {
  productId: string;
  variantId?: string | null;
  quantity?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = adminClient();
  try {
    const body = await req.json().catch(() => ({}));
    const storeSlug = String(body.storeSlug || "").trim();
    const lines: LineInput[] = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer ?? {};
    const email = String(customer.email || "").trim().toLowerCase();
    const origin = req.headers.get("origin") || SITE_URL;

    if (!storeSlug) return json({ error: "Missing store." }, 400);
    if (!lines.length) return json({ error: "Your basket is empty." }, 400);
    if (!email.includes("@")) return json({ error: "A valid email address is required." }, 400);

    // ---- Store must be published ----
    const { data: store } = await admin
      .from("shop_stores")
      .select("id, workspace_id, name, slug, currency, status, platform_fee_bps")
      .eq("slug", storeSlug)
      .eq("status", "published")
      .maybeSingle();
    if (!store) return json({ error: "This store is not available." }, 404);

    // ---- Seller must have a working Stripe connection ----
    const { data: seller } = await admin
      .from("seller_payment_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("workspace_id", store.workspace_id)
      .maybeSingle();
    if (!seller?.stripe_account_id || !seller.charges_enabled) {
      return json({ error: "This store cannot take payments yet. Please contact the seller." }, 400);
    }

    // ---- Server-side pricing ----
    const productIds = [...new Set(lines.map((l) => String(l.productId)))];
    const { data: products } = await admin
      .from("shop_products")
      .select(
        "id, store_id, name, slug, product_type, status, visibility, price_amount, currency, billing_type, billing_interval, trial_days, requires_shipping, track_inventory, inventory_quantity, allow_backorder, sku",
      )
      .in("id", productIds)
      .eq("store_id", store.id)
      .eq("status", "active")
      .eq("visibility", "public");

    if (!products?.length) return json({ error: "These items are no longer available." }, 400);

    const variantIds = lines.map((l) => l.variantId).filter(Boolean) as string[];
    const { data: variants } = variantIds.length
      ? await admin
        .from("shop_product_variants")
        .select("id, product_id, name, sku, price_amount, inventory_quantity, is_active")
        .in("id", variantIds)
      : { data: [] as any[] };

    const currency = store.currency || "GBP";
    const priced: any[] = [];
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return json({ error: "One of the items is no longer available." }, 400);
      const quantity = Math.max(1, Math.min(999, Number(line.quantity) || 1));
      const variant = line.variantId ? variants?.find((v) => v.id === line.variantId) : null;
      if (line.variantId && (!variant || variant.product_id !== product.id || !variant.is_active)) {
        return json({ error: `Please choose an available option for ${product.name}.` }, 400);
      }
      const unit = variant?.price_amount ?? product.price_amount;
      if (!unit || unit < 0) return json({ error: `${product.name} is not purchasable.` }, 400);

      if (product.track_inventory && !product.allow_backorder) {
        const stock = variant ? variant.inventory_quantity : product.inventory_quantity;
        if (stock < quantity) return json({ error: `${product.name} is out of stock.` }, 400);
      }

      priced.push({
        product,
        variant,
        quantity,
        unit,
        total: unit * quantity,
        recurring: product.billing_type === "recurring",
      });
    }

    const recurringCount = priced.filter((p) => p.recurring).length;
    if (recurringCount && recurringCount !== priced.length) {
      return json({ error: "Subscriptions must be bought separately from one-off items." }, 400);
    }
    const mode: "payment" | "subscription" = recurringCount ? "subscription" : "payment";

    const subtotal = priced.reduce((sum, p) => sum + p.total, 0);

    // ---- Discount ----
    let discountAmount = 0;
    let discountCode: string | null = null;
    const rawCode = String(body.discountCode || "").trim().toUpperCase();
    if (rawCode) {
      const { data: discount } = await admin
        .from("shop_discounts")
        .select("*")
        .eq("store_id", store.id)
        .eq("code", rawCode)
        .eq("is_active", true)
        .maybeSingle();
      const now = Date.now();
      const valid = discount &&
        (!discount.starts_at || new Date(discount.starts_at).getTime() <= now) &&
        (!discount.ends_at || new Date(discount.ends_at).getTime() >= now) &&
        (!discount.max_redemptions || discount.redemption_count < discount.max_redemptions) &&
        (!discount.min_subtotal || subtotal >= discount.min_subtotal);
      if (!valid) return json({ error: "That discount code is not valid." }, 400);
      discountCode = discount.code;
      discountAmount = discount.discount_type === "percentage"
        ? Math.round((subtotal * discount.value) / 100)
        : Math.min(discount.value, subtotal);
    }

    // ---- Shipping ----
    const needsShipping = priced.some((p) => p.product.requires_shipping);
    let shippingAmount = 0;
    let shippingRateId: string | null = null;
    if (needsShipping) {
      const country = String(customer.country || customer.address?.country || "").toUpperCase();
      const { data: zones } = await admin
        .from("shop_shipping_zones")
        .select("id, countries, is_active")
        .eq("store_id", store.id)
        .eq("is_active", true);
      const zone = zones?.find((z) => z.countries?.includes(country)) ?? zones?.[0];
      if (zone) {
        const { data: rates } = await admin
          .from("shop_shipping_rates")
          .select("id, name, amount, free_over_amount, rate_type, is_active")
          .eq("zone_id", zone.id)
          .eq("is_active", true)
          .order("amount", { ascending: true });
        const chosen = rates?.find((r) => r.id === body.shippingRateId) ?? rates?.[0];
        if (chosen) {
          shippingRateId = chosen.id;
          const freeOver = chosen.free_over_amount;
          shippingAmount = chosen.rate_type === "pickup" || (freeOver != null && subtotal - discountAmount >= freeOver)
            ? 0
            : chosen.amount;
        }
      }
    }

    const total = Math.max(0, subtotal - discountAmount + shippingAmount);

    // ---- Customer record ----
    const userId = await callerUserId(req, admin);
    const { data: shopCustomer } = await admin
      .from("shop_customers")
      .upsert({
        workspace_id: store.workspace_id,
        store_id: store.id,
        email,
        full_name: customer.full_name ?? null,
        phone: customer.phone ?? null,
        user_id: userId,
        marketing_opt_in: Boolean(customer.marketing_opt_in),
      }, { onConflict: "store_id,email" })
      .select("id")
      .maybeSingle();

    // ---- Order ----
    const { data: order, error: orderErr } = await admin
      .from("shop_orders")
      .insert({
        workspace_id: store.workspace_id,
        store_id: store.id,
        customer_id: shopCustomer?.id ?? null,
        user_id: userId,
        order_number: orderNumber(),
        email,
        full_name: customer.full_name ?? null,
        phone: customer.phone ?? null,
        status: "pending",
        fulfilment_status: needsShipping ? "unfulfilled" : "not_required",
        currency,
        subtotal_amount: subtotal,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        total_amount: total,
        discount_code: discountCode,
        shipping_address: customer.address ?? {},
        billing_address: customer.billing_address ?? customer.address ?? {},
        shipping_rate_id: shippingRateId,
        stripe_account_id: seller.stripe_account_id,
        notes: customer.notes ?? null,
      })
      .select("id, order_number")
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error("Could not create the order.");

    await admin.from("shop_order_items").insert(priced.map((p) => ({
      workspace_id: store.workspace_id,
      order_id: order.id,
      product_id: p.product.id,
      variant_id: p.variant?.id ?? null,
      name: p.variant ? `${p.product.name} — ${p.variant.name}` : p.product.name,
      product_type: p.product.product_type,
      sku: p.variant?.sku ?? p.product.sku ?? null,
      quantity: p.quantity,
      unit_amount: p.unit,
      total_amount: p.total,
      requires_shipping: Boolean(p.product.requires_shipping),
    })));

    await admin.from("shop_order_status_history").insert({
      workspace_id: store.workspace_id,
      order_id: order.id,
      to_status: "pending",
      source: "checkout",
    });

    // ---- Stripe Checkout Session on the connected account ----
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const cur = stripeCurrency(currency);

    const lineItems = priced.map((p) => ({
      quantity: p.quantity,
      price_data: {
        currency: cur,
        unit_amount: p.unit,
        product_data: { name: p.variant ? `${p.product.name} — ${p.variant.name}` : p.product.name },
        ...(p.recurring
          ? { recurring: { interval: (p.product.billing_interval || "month") as "day" | "week" | "month" | "year" } }
          : {}),
      },
    }));

    if (mode === "payment" && shippingAmount > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: cur,
          unit_amount: shippingAmount,
          product_data: { name: "Shipping" },
        },
      } as any);
    }

    const feeBps = Number(store.platform_fee_bps || 0);
    const applicationFee = feeBps > 0 ? Math.round((total * feeBps) / 10000) : 0;

    // Discounts must exist on the connected account to actually reduce the charge.
    let stripeCouponId: string | null = null;
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountAmount,
        currency: cur,
        duration: "once",
        name: discountCode ?? "Discount",
        max_redemptions: 1,
      }, { stripeAccount: seller.stripe_account_id });
      stripeCouponId = coupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: email,
      line_items: lineItems as any,
      success_url: `${origin}/s/${store.slug}/order/${order.id}?status=success`,
      cancel_url: `${origin}/s/${store.slug}/checkout?status=cancelled`,
      client_reference_id: order.id,
      metadata: {
        type: "shop_order",
        order_id: order.id,
        store_id: store.id,
        workspace_id: store.workspace_id,
      },
      ...(mode === "payment"
        ? {
          payment_intent_data: {
            metadata: { order_id: order.id, workspace_id: store.workspace_id },
            ...(applicationFee > 0 ? { application_fee_amount: applicationFee } : {}),
          },
        }
        : {
          subscription_data: {
            metadata: { order_id: order.id, workspace_id: store.workspace_id },
            ...(feeBps > 0 ? { application_fee_percent: feeBps / 100 } : {}),
          },
        }),
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),

    }, {
      stripeAccount: seller.stripe_account_id,
      idempotencyKey: `shop_order_${order.id}`,
    });

    await admin.from("shop_orders").update({
      stripe_checkout_session_id: session.id,
      status: "payment_processing",
    }).eq("id", order.id);

    await logCommerceEvent(admin, {
      workspace_id: store.workspace_id,
      store_id: store.id,
      event_type: "checkout_started",
      order_id: order.id,
      customer_id: shopCustomer?.id ?? null,
      payload: { total, currency, mode },
    });

    return json({ url: session.url, orderId: order.id, orderNumber: order.order_number });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shop-checkout] error", message);
    return json({ error: message }, 500);
  }
});
