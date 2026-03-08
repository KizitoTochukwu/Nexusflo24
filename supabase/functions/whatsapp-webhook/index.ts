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
  // OPTIONS = CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET = Meta webhook verification challenge
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook GET verification request:", { mode, hasToken: !!token, hasChallenge: !!challenge });

    if (mode !== "subscribe" || !token || !challenge) {
      console.log("Missing or invalid params — returning 400");
      return new Response("Bad request", { status: 400 });
    }

    const encryptionKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("WHATSAPP_SETTINGS_ENCRYPTION_KEY not set");
      return new Response("Server error", { status: 500 });
    }

    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: allSettings, error: fetchErr } = await adminClient
        .from("whatsapp_settings")
        .select("verify_token_encrypted")
        .eq("is_active", true);

      if (fetchErr) {
        console.error("DB fetch error:", fetchErr.message);
        return new Response("Server error", { status: 500 });
      }

      console.log(`Found ${allSettings?.length ?? 0} active whatsapp_settings rows`);

      let verified = false;
      for (const s of allSettings || []) {
        try {
          const decryptedToken = await decrypt(s.verify_token_encrypted, encryptionKey);
          if (decryptedToken === token) {
            verified = true;
            break;
          }
        } catch (decErr) {
          console.error("Decryption failed for a row:", decErr);
        }
      }

      if (!verified) {
        console.log("No matching verify token found — returning 403");
        return new Response("Forbidden", { status: 403 });
      }

      console.log("Verify token matched — returning challenge");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("Unexpected error during GET verification:", err);
      return new Response("Server error", { status: 500 });
    }
  }

  // POST = inbound messages + status updates from Meta
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

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
          for (const st of statuses) {
            if (st.id) {
              // Update whatsapp_messages status
              await adminClient
                .from("whatsapp_messages")
                .update({ status: st.status })
                .eq("wa_message_id", st.id);

              // If status is "read", update campaign_messages.opened for the linked lead
              if (st.status === "read") {
                // Find the whatsapp_message to get lead_id
                const { data: waMsg } = await adminClient
                  .from("whatsapp_messages")
                  .select("lead_id, workspace_id")
                  .eq("wa_message_id", st.id)
                  .maybeSingle();

                if (waMsg?.lead_id) {
                  await adminClient
                    .from("campaign_messages")
                    .update({ opened: true })
                    .eq("lead_id", waMsg.lead_id)
                    .eq("channel", "whatsapp")
                    .eq("workspace_id", waMsg.workspace_id)
                    .eq("opened", false);

                  console.log(`WhatsApp read status: updated campaign_messages.opened for lead ${waMsg.lead_id}`);
                }
              }

              // If status is "delivered", also update campaign_messages delivery_status
              if (st.status === "delivered") {
                const { data: waMsg } = await adminClient
                  .from("whatsapp_messages")
                  .select("lead_id, workspace_id")
                  .eq("wa_message_id", st.id)
                  .maybeSingle();

                if (waMsg?.lead_id) {
                  await adminClient
                    .from("campaign_messages")
                    .update({ delivery_status: "delivered" })
                    .eq("lead_id", waMsg.lead_id)
                    .eq("channel", "whatsapp")
                    .eq("workspace_id", waMsg.workspace_id)
                    .in("delivery_status", ["pending", "sent"]);
                }
              }
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

  return new Response("Method not allowed", { status: 405 });
});
