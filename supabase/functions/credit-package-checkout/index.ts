import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    const email = claims?.claims?.email;
    if (!userId || !email) return json({ error: "unauthorized" }, 401);

    const { package_id, workspace_id } = await req.json();
    if (!package_id || !workspace_id) return json({ error: "missing fields" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isMember } = await admin.rpc("is_workspace_member", { _user_id: userId, _workspace_id: workspace_id });
    if (!isMember) return json({ error: "forbidden" }, 403);

    const { data: pkg, error } = await admin
      .from("credit_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !pkg) return json({ error: "package not found" }, 404);
    if (!pkg.stripe_price_id) return json({ error: "package has no stripe_price_id" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" as any });
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.get("origin") || "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      mode: "payment",
      line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/dashboard/${workspace_id}/settings?credits=success`,
      cancel_url: `${origin}/dashboard/${workspace_id}/settings?credits=cancel`,
      metadata: {
        type: "credit_package",
        package_id: pkg.id,
        workspace_id,
        channel: pkg.channel,
        credits: String(pkg.credits),
      },
    });

    return json({ url: session.url });
  } catch (e: any) {
    console.error("[credit-package-checkout]", e);
    return json({ error: e.message || "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
