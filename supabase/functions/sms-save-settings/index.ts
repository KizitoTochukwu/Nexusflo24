import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function encrypt(text: string, keyHex: string): Promise<string> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { workspaceId, provider, accountSid, authToken, fromNumber } = body;

    if (!workspaceId || !provider || !authToken) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, provider, authToken" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!["twilio", "vonage"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Encrypt authToken
    const encryptionKey = Deno.env.get("SMS_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("SMS_SETTINGS_ENCRYPTION_KEY not configured");
      return new Response(JSON.stringify({ error: "SMS encryption not configured on server" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptedToken = await encrypt(authToken, encryptionKey);

    // Use service role for upsert to bypass RLS (we already verified auth)
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check workspace membership (admin/owner)
    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", { _user_id: userId, _workspace_id: workspaceId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only workspace admins can manage SMS settings" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deactivate existing settings for this workspace+provider
    await adminClient.from("sms_settings").update({ is_active: false }).eq("workspace_id", workspaceId).eq("provider", provider);

    // Insert new active settings
    const { error: insertErr } = await adminClient.from("sms_settings").insert({
      workspace_id: workspaceId,
      provider,
      account_sid: accountSid || null,
      auth_token_encrypted: encryptedToken,
      from_number: fromNumber || null,
      is_active: true,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save SMS settings" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("sms-save-settings error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
