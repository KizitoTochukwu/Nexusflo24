import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("nexusflo24-whatsapp"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  if (cleaned.startsWith("00")) { const intl = `+${cleaned.slice(2)}`; return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null; }
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  if (/^[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned}`;
  return null;
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
    const { workspaceId, to, type = "text", body: msgBody } = body;

    if (!workspaceId || !to || !msgBody) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use E.164 format like +447517327597" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: userId, _workspace_id: workspaceId });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settings } = await adminClient
      .from("whatsapp_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!settings) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured. Go to Settings → Integrations to set up WhatsApp." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptionKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Server encryption not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await decrypt(settings.access_token_encrypted, encryptionKey);
    const phoneNumberId = settings.phone_number_id;

    // Strip leading + for WhatsApp API
    const waTo = normalizedTo.startsWith("+") ? normalizedTo.slice(1) : normalizedTo;

    const waPayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "text",
      text: { body: msgBody },
    };

    const waRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waPayload),
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      const errMsg = waData?.error?.message || `WhatsApp API error: ${waRes.status}`;
      const errCode = waData?.error?.code;

      // Log failed message
      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId,
        direction: "outbound",
        phone_number: normalizedTo,
        message_type: type,
        body: msgBody,
        status: "failed",
        error: errMsg,
      });

      const isClientError = [190, 100, 131000, 131026, 131047, 131051].includes(errCode) || waRes.status === 400 || waRes.status === 401;
      return new Response(JSON.stringify({ success: false, error: errMsg }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waMessageId = waData?.messages?.[0]?.id || null;

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      wa_message_id: waMessageId,
      direction: "outbound",
      phone_number: normalizedTo,
      message_type: type,
      body: msgBody,
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true, waMessageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send WhatsApp message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
