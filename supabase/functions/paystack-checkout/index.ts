// Paystack checkout (NGN). Supports subscription (with plan code) and one-time credit purchases.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDITS_PER_PACK: Record<string, number> = { email: 1000, sms: 100, whatsapp: 100 };

interface SubBody {
  mode: "subscription";
  planKey: string;
  billingCycle: "monthly" | "yearly";
  currency: string;
  workspaceId?: string;
}
interface CreditBody {
  mode: "credits";
  channel: "email" | "sms" | "whatsapp";
  quantity: number;
  currency: string;
  workspaceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Paystack (NGN) payments aren't enabled yet." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = (await req.json()) as SubBody | CreditBody;
    const origin = req.headers.get("origin") || "https://nexusflo24.lovable.app";
    const currency = (body.currency || "NGN").toUpperCase();

    let planKey: string;
    let billingCycle: string;
    let metadata: Record<string, unknown> = {
      userId: user.id,
      workspaceId: (body as SubBody).workspaceId ?? (body as CreditBody).workspaceId ?? null,
      currency,
    };
    let successPath: string;
    let cancelPath: string;

    if (body.mode === "subscription") {
      planKey = body.planKey;
      billingCycle = body.billingCycle;
      metadata = { ...metadata, type: "subscription", planKey, billingCycle };
      successPath = `/dashboard/${body.workspaceId ?? ""}/settings?tab=billing&checkout=success`;
      cancelPath = `/pricing?checkout=cancel`;
    } else {
      planKey = `credit_${body.channel}`;
      billingCycle = "one_time";
      const credits = CREDITS_PER_PACK[body.channel] * (body.quantity || 1);
      metadata = {
        ...metadata,
        type: "credit_purchase",
        channel: body.channel,
        credits: String(credits),
        quantity: body.quantity || 1,
      };
      successPath = `/dashboard/${body.workspaceId}/settings?tab=usage&purchase=success`;
      cancelPath = `/dashboard/${body.workspaceId}/settings?tab=usage&purchase=cancel`;
    }

    // Look up price row
    const { data: priceRow } = await supabase
      .from("regional_prices")
      .select("amount_minor,paystack_plan_code")
      .eq("plan_key", planKey)
      .eq("billing_cycle", billingCycle)
      .eq("currency", currency)
      .eq("active", true)
      .maybeSingle();

    if (!priceRow) throw new Error(`No ${currency} price configured for ${planKey} (${billingCycle}). Ask an admin to set it in Admin → Pricing.`);

    const amountKobo = body.mode === "credits"
      ? priceRow.amount_minor * (body.quantity || 1)
      : priceRow.amount_minor;

    const initBody: Record<string, unknown> = {
      email: user.email,
      amount: amountKobo,
      currency,
      callback_url: `${origin}${successPath}`,
      metadata: { ...metadata, cancel_action: `${origin}${cancelPath}` },
    };

    if (body.mode === "subscription") {
      if (!priceRow.paystack_plan_code) {
        throw new Error("This subscription plan has no Paystack plan code yet. Ask an admin to add one in Admin → Pricing.");
      }
      initBody.plan = priceRow.paystack_plan_code;
    }

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initBody),
    });
    const json = await resp.json();
    if (!resp.ok || !json.status) {
      throw new Error(json.message || "Paystack initialization failed");
    }

    return new Response(
      JSON.stringify({ url: json.data.authorization_url, reference: json.data.reference }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[paystack-checkout] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
