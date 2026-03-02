import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  // GET = webhook verification from Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !challenge) {
      return new Response("Bad request", { status: 400 });
    }

    // We need to find the workspace that owns this verify token
    const encryptionKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("WHATSAPP_SETTINGS_ENCRYPTION_KEY not configured");
      return new Response("Server error", { status: 500 });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allSettings } = await adminClient
      .from("whatsapp_settings")
      .select("verify_token_encrypted")
      .eq("is_active", true);

    let verified = false;
    for (const s of allSettings || []) {
      try {
        const decryptedToken = await decrypt(s.verify_token_encrypted, encryptionKey);
        if (decryptedToken === token) { verified = true; break; }
      } catch { /* skip */ }
    }

    if (!verified) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // POST = inbound messages + status updates
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) continue;

          // Look up workspace by phone_number_id
          const { data: settings } = await adminClient
            .from("whatsapp_settings")
            .select("workspace_id")
            .eq("phone_number_id", phoneNumberId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          const workspaceId = settings?.workspace_id;
          if (!workspaceId) continue;

          // Handle inbound messages
          const messages = value?.messages || [];
          for (const msg of messages) {
            await adminClient.from("whatsapp_messages").insert({
              workspace_id: workspaceId,
              wa_message_id: msg.id,
              direction: "inbound",
              phone_number: msg.from ? `+${msg.from}` : "unknown",
              message_type: msg.type || "text",
              body: msg.text?.body || msg.type || "",
              status: "received",
            });
          }

          // Handle status updates
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            if (status.id) {
              await adminClient
                .from("whatsapp_messages")
                .update({ status: status.status })
                .eq("wa_message_id", status.id);
            }
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("whatsapp-webhook POST error:", err);
      return new Response("OK", { status: 200 }); // Always return 200 to Meta
    }
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response("Method not allowed", { status: 405 });
});
