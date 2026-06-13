import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COL: Record<string, string> = {
  email: "email_balance",
  sms: "sms_balance",
  whatsapp: "whatsapp_balance",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { workspaceId, channel, amount, reason } = await req.json();
    if (!workspaceId || !channel || typeof amount !== "number" || !COL[channel]) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const col = COL[channel];
    const { data: existing } = await admin.from("message_credits").select("*").eq("workspace_id", workspaceId).maybeSingle();
    const current = (existing as any)?.[col] ?? 0;
    const next = Math.max(0, current + amount);

    if (existing) {
      await admin.from("message_credits").update({ [col]: next }).eq("workspace_id", workspaceId);
    } else {
      await admin.from("message_credits").insert({ workspace_id: workspaceId, [col]: next });
    }

    await admin.from("credit_transactions").insert({
      workspace_id: workspaceId,
      channel,
      amount,
      reason: reason || "admin_adjustment",
      reference_id: `admin:${user.id}`,
    });

    return new Response(JSON.stringify({ success: true, new_balance: next }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
