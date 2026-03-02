import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function decrypt(encryptedBase64: string, keyHex: string): Promise<string> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function sendTwilioSms(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Twilio error: ${res.status}`);
  return { providerMessageId: data.sid, status: data.status };
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
    const { workspaceId, to, message } = body;

    if (!workspaceId || !to || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate phone number format
    if (!/^\+?[1-9]\d{1,14}$/.test(to.replace(/[\s\-()]/g, ""))) {
      return new Response(JSON.stringify({ error: "Invalid phone number format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify workspace membership
    const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: userId, _workspace_id: workspaceId });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get active SMS settings
    const { data: settings, error: settingsErr } = await adminClient
      .from("sms_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (settingsErr || !settings) {
      return new Response(JSON.stringify({ error: "SMS not configured. Go to Settings → Integrations to set up your SMS provider." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptionKey = Deno.env.get("SMS_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Server encryption not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authToken = await decrypt(settings.auth_token_encrypted, encryptionKey);

    let result: { providerMessageId: string; status: string };

    if (settings.provider === "twilio") {
      if (!settings.account_sid || !settings.from_number) {
        return new Response(JSON.stringify({ error: "Twilio Account SID and From Number are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      result = await sendTwilioSms(settings.account_sid, authToken, settings.from_number, to, message);
    } else {
      return new Response(JSON.stringify({ error: `Provider '${settings.provider}' not yet implemented` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log success
    await adminClient.from("sms_logs").insert({
      workspace_id: workspaceId,
      provider: settings.provider,
      to_number: to,
      from_number: settings.from_number,
      message,
      status: "sent",
      provider_message_id: result.providerMessageId,
    });

    return new Response(JSON.stringify({ success: true, providerMessageId: result.providerMessageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("sms-send error:", err);

    // Try to log failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.workspaceId) {
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("sms_logs").insert({
          workspace_id: body.workspaceId,
          provider: "unknown",
          to_number: body.to || "unknown",
          from_number: null,
          message: body.message || "",
          status: "failed",
          error: err.message || "Unknown error",
        });
      }
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ success: false, error: err.message || "Failed to send SMS" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
