import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function deriveKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("nexusflo24-sms"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await deriveKey(secret, ["decrypt"]);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function normalizePhoneNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  }

  if (cleaned.startsWith("00")) {
    const intl = `+${cleaned.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null;
  }

  // UK local fallback (e.g., 07xxxxxxxxx -> +447xxxxxxxxx)
  if (/^0\d{10}$/.test(cleaned)) {
    return `+44${cleaned.slice(1)}`;
  }

  // If country code is provided without plus, normalize it
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
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

    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use international format like +447517327597." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
    let normalizedFrom: string | null = null;

    if (settings.provider === "twilio") {
      if (!settings.account_sid || !settings.from_number) {
        return new Response(JSON.stringify({ error: "Twilio Account SID and From Number are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      normalizedFrom = normalizePhoneNumber(settings.from_number);
      if (!normalizedFrom) {
        return new Response(JSON.stringify({ error: "Configured Twilio From Number is invalid. Please re-save SMS settings with a valid E.164 number." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (normalizedTo === normalizedFrom) {
        return new Response(JSON.stringify({ error: "'To' and 'From' number cannot be the same" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      result = await sendTwilioSms(settings.account_sid, authToken, normalizedFrom, normalizedTo, message);
    } else {
      return new Response(JSON.stringify({ error: `Provider '${settings.provider}' not yet implemented` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log success
    await adminClient.from("sms_logs").insert({
      workspace_id: workspaceId,
      provider: settings.provider,
      to_number: normalizedTo,
      from_number: normalizedFrom,
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

    const errMsgRaw = err?.message || "Failed to send SMS";
    const isTwilioPairError = /current combination of 'To'.*'From'|and\/or 'From' parameters/i.test(errMsgRaw);
    const isClientError = /Invalid 'To' Phone Number|Invalid 'From' Phone Number|cannot be the same/i.test(errMsgRaw) || isTwilioPairError;
    const errMsg = isTwilioPairError
      ? "Twilio rejected this To/From combination. If your account is in trial mode, verify the recipient number in Twilio and ensure SMS permissions are enabled for that destination country."
      : errMsgRaw;

    return new Response(JSON.stringify({ success: false, error: errMsg }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
