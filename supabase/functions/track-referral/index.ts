import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { referralCode, referredUserId } = await req.json();

    if (!referralCode) {
      return new Response(JSON.stringify({ error: "Missing referralCode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the referrer by code
    const { data: existingRef } = await adminClient
      .from("referrals")
      .select("id")
      .eq("referral_code", referralCode)
      .eq("referred_user_id", referredUserId)
      .maybeSingle();

    if (existingRef) {
      return new Response(JSON.stringify({ success: true, message: "Already tracked" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find referrer user by matching code (first 8 chars of user id)
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id")
      .limit(500);

    const referrer = (profiles || []).find((p: any) => p.id?.slice(0, 8) === referralCode);

    if (!referrer) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const status = referredUserId ? "signed_up" : "clicked";

    await adminClient.from("referrals").insert({
      referrer_user_id: referrer.id,
      referred_user_id: referredUserId || null,
      referral_code: referralCode,
      status,
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("track-referral error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
