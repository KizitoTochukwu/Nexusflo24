// Issues short-lived signed download links for digital products the caller has paid for.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, callerUserId, corsHeaders, json } from "../_shared/shop.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = adminClient();
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || "");
    const fileId = String(body.fileId || "");
    const email = String(body.email || "").trim().toLowerCase();
    if (!orderId || !fileId) return json({ error: "orderId and fileId are required." }, 400);

    const { data: order } = await admin
      .from("shop_orders")
      .select("id, user_id, email, status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.status !== "paid" && order.status !== "partially_refunded") {
      return json({ error: "This order has not been paid yet." }, 403);
    }

    // Ownership: signed-in buyer, or a guest proving the order email.
    const userId = await callerUserId(req, admin);
    const owns = (userId && order.user_id === userId) || (!!email && email === order.email.toLowerCase());
    if (!owns) return json({ error: "You do not have access to this download." }, 403);

    const { data: file } = await admin
      .from("shop_product_files")
      .select("id, product_id, storage_path, file_name")
      .eq("id", fileId)
      .maybeSingle();
    if (!file) return json({ error: "File not found." }, 404);

    const { data: item } = await admin
      .from("shop_order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("product_id", file.product_id)
      .maybeSingle();
    if (!item) return json({ error: "This file is not part of your order." }, 403);

    const { data: signed, error } = await admin.storage
      .from("store-downloads")
      .createSignedUrl(file.storage_path, 60 * 15, { download: file.file_name ?? undefined });
    if (error || !signed?.signedUrl) throw error ?? new Error("Could not create a download link.");

    return json({ url: signed.signedUrl, fileName: file.file_name, expiresInSeconds: 900 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shop-download-url] error", message);
    return json({ error: message }, 500);
  }
});
