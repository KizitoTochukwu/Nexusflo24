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
    ["encrypt"],
  );
}

async function encrypt(text: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

type ValidationResult = { ok: true } | { ok: false; message: string };

async function validateWhatsAppCredentials(phoneNumberId: string, accessToken: string): Promise<ValidationResult> {
  const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name`;

  try {
    const res = await fetch(graphUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      const graphMessage = payload?.error?.message || "Failed to verify WhatsApp credentials";
      const graphCode = Number(payload?.error?.code ?? 0);

      if (graphCode === 190) {
        return { ok: false, message: "Meta Access Token is invalid or expired. Generate a Permanent System User token and try again." };
      }

      if (graphCode === 100 || /does not exist|missing permissions|Unsupported post request/i.test(graphMessage)) {
        return {
          ok: false,
          message: "Phone Number ID or token permissions are invalid. Use the exact Phone Number ID from Meta WhatsApp API Setup and a token with whatsapp_business_messaging permission.",
        };
      }

      return { ok: false, message: graphMessage };
    }

    if (String(payload?.id || "") !== phoneNumberId) {
      return { ok: false, message: "Phone Number ID verification failed. Please confirm you pasted the WhatsApp Phone Number ID (not WABA ID)." };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Could not reach Meta Graph API. Please try again in a moment." };
  }
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
    const normalizedWorkspaceId = String(body?.workspaceId || "").trim();
    const normalizedPhoneNumberId = String(body?.phoneNumberId || "").trim();
    const normalizedAccessToken = String(body?.accessToken || "").trim();
    const normalizedVerifyToken = String(body?.verifyToken || "").trim();

    if (!normalizedWorkspaceId || !normalizedPhoneNumberId || !normalizedAccessToken || !normalizedVerifyToken) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!/^\d{8,25}$/.test(normalizedPhoneNumberId)) {
      return new Response(JSON.stringify({ error: "Invalid Phone Number ID format. Paste the numeric Phone Number ID from Meta API Setup." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validation = await validateWhatsAppCredentials(normalizedPhoneNumberId, normalizedAccessToken);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptionKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("WHATSAPP_SETTINGS_ENCRYPTION_KEY not configured");
      return new Response(JSON.stringify({ error: "WhatsApp encryption not configured on server" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptedAccessToken = await encrypt(normalizedAccessToken, encryptionKey);
    const encryptedVerifyToken = await encrypt(normalizedVerifyToken, encryptionKey);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", { _user_id: userId, _workspace_id: normalizedWorkspaceId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only workspace admins can manage WhatsApp settings" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deactivate existing
    await adminClient.from("whatsapp_settings").update({ is_active: false }).eq("workspace_id", normalizedWorkspaceId);

    // Insert new
    const { error: insertErr } = await adminClient.from("whatsapp_settings").insert({
      workspace_id: normalizedWorkspaceId,
      phone_number_id: normalizedPhoneNumberId,
      access_token_encrypted: encryptedAccessToken,
      verify_token_encrypted: encryptedVerifyToken,
      is_active: true,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save WhatsApp settings" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("whatsapp-save-settings error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
