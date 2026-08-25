// Storefront transactional emails: order confirmation and shipment notifications.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders, esc, formatAmount, json, SITE_URL } from "../_shared/shop.ts";

type EventType = "order_paid" | "order_shipped" | "seller_new_order";

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("[shop-notify] RESEND_API_KEY missing — skipping email to", to);
    return { skipped: true };
  }
  const from = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[shop-notify] send failed", res.status, text);
    return { sent: false, error: text };
  }
  return { sent: true };
}

function shell(storeName: string, accent: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Inter,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e6e8ee">
      <p style="margin:0 0 16px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${esc(accent)}">${esc(storeName)}</p>
      ${inner}
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#8b95a8">Powered by NexusFlo24</p>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = adminClient();

  try {
    const body = await req.json().catch(() => ({}));
    const event = String(body.event || "") as EventType;
    const orderId = String(body.order_id || "");
    if (!orderId) return json({ error: "order_id is required" }, 400);

    const { data: order } = await admin.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);

    const { data: store } = await admin
      .from("shop_stores")
      .select("id, name, slug, business_email")
      .eq("id", order.store_id)
      .maybeSingle();
    const { data: branding } = await admin
      .from("shop_store_branding")
      .select("accent_color")
      .eq("store_id", order.store_id)
      .maybeSingle();
    const { data: items } = await admin
      .from("shop_order_items")
      .select("name, quantity, total_amount")
      .eq("order_id", orderId);

    const accent = branding?.accent_color || "#D4AF37";
    const storeName = store?.name || "Store";
    const orderUrl = `${SITE_URL}/s/${store?.slug}/order/${order.id}`;
    const rows = (items ?? []).map((i) =>
      `<tr><td style="padding:6px 0;color:#3b4256">${esc(i.name)} × ${i.quantity}</td>
       <td style="padding:6px 0;text-align:right;color:#0b1f3a">${formatAmount(i.total_amount, order.currency)}</td></tr>`
    ).join("");

    if (event === "order_paid") {
      const html = shell(storeName, accent, `
        <h1 style="margin:0 0 8px;font-size:22px;color:#0b1f3a">Thanks for your order</h1>
        <p style="margin:0 0 20px;color:#5b6478">Order ${esc(order.order_number)} is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
          <tr><td style="padding:12px 0 0;border-top:1px solid #e6e8ee;font-weight:600;color:#0b1f3a">Total</td>
          <td style="padding:12px 0 0;border-top:1px solid #e6e8ee;text-align:right;font-weight:600;color:#0b1f3a">${formatAmount(order.total_amount, order.currency)}</td></tr>
        </table>
        <p style="margin:24px 0 0"><a href="${esc(orderUrl)}" style="background:#0b1f3a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:14px">View your order</a></p>`);
      const result = await sendEmail(order.email, `Order ${order.order_number} confirmed`, html, store?.business_email ?? undefined);
      return json({ ok: true, result });
    }

    if (event === "seller_new_order") {
      const to = store?.business_email;
      if (!to) return json({ ok: true, skipped: "no seller email" });
      const html = shell(storeName, accent, `
        <h1 style="margin:0 0 8px;font-size:22px;color:#0b1f3a">New order received</h1>
        <p style="margin:0 0 20px;color:#5b6478">${esc(order.email)} placed order ${esc(order.order_number)}.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
          <tr><td style="padding:12px 0 0;border-top:1px solid #e6e8ee;font-weight:600;color:#0b1f3a">Total</td>
          <td style="padding:12px 0 0;border-top:1px solid #e6e8ee;text-align:right;font-weight:600;color:#0b1f3a">${formatAmount(order.total_amount, order.currency)}</td></tr>
        </table>`);
      const result = await sendEmail(to, `New order ${order.order_number}`, html);
      return json({ ok: true, result });
    }

    if (event === "order_shipped") {
      const { data: fulfilment } = await admin
        .from("shop_fulfilments")
        .select("carrier, tracking_number, tracking_url")
        .eq("id", String(body.fulfilment_id || ""))
        .maybeSingle();
      const tracking = fulfilment?.tracking_number
        ? `<p style="margin:0 0 20px;color:#5b6478">${esc(fulfilment.carrier || "Carrier")} tracking: <strong>${esc(fulfilment.tracking_number)}</strong></p>`
        : "";
      const trackBtn = fulfilment?.tracking_url
        ? `<p style="margin:24px 0 0"><a href="${esc(fulfilment.tracking_url)}" style="background:#0b1f3a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:14px">Track your parcel</a></p>`
        : `<p style="margin:24px 0 0"><a href="${esc(orderUrl)}" style="background:#0b1f3a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:14px">View your order</a></p>`;
      const html = shell(storeName, accent, `
        <h1 style="margin:0 0 8px;font-size:22px;color:#0b1f3a">Your order is on its way</h1>
        <p style="margin:0 0 8px;color:#5b6478">Order ${esc(order.order_number)} has been despatched.</p>
        ${tracking}${trackBtn}`);
      const result = await sendEmail(order.email, `Order ${order.order_number} despatched`, html, store?.business_email ?? undefined);
      if (body.fulfilment_id) {
        await admin.from("shop_fulfilments").update({ notified_at: new Date().toISOString() }).eq("id", body.fulfilment_id);
      }
      return json({ ok: true, result });
    }

    return json({ error: "Unknown event" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shop-notify] error", message);
    return json({ error: message }, 500);
  }
});
