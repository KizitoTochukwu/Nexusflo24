import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decrypt(cipherB64: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["decrypt"]);
  const combined = base64ToBytes(cipherB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  let binary = "";
  for (const b of combined) binary += String.fromCharCode(b);
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, phoneNumber } = await req.json();
    if (!workspaceId || !phoneNumber) {
      return new Response(JSON.stringify({ error: "Missing workspaceId or phoneNumber" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", {
      _user_id: user.id,
      _workspace_id: workspaceId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace SMS config to retrieve subaccount credentials
    const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Encryption key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: channelRow } = await adminClient
      .from("workspace_channel_settings")
      .select("config_encrypted")
      .eq("workspace_id", workspaceId)
      .eq("channel", "sms")
      .eq("is_active", true)
      .maybeSingle();

    if (!channelRow?.config_encrypted) {
      return new Response(JSON.stringify({ error: "No SMS subaccount found. Provision one first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = JSON.parse(await decrypt(channelRow.config_encrypted, encryptionKey));
    if (!config.account_sid || !config.auth_token) {
      return new Response(JSON.stringify({ error: "Invalid subaccount credentials" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Purchase the phone number on the subaccount
    const buyRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${config.account_sid}:${config.auth_token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ PhoneNumber: phoneNumber }),
      }
    );

    if (!buyRes.ok) {
      const errBody = await buyRes.text();
      console.error("Twilio buy number failed:", errBody);
      return new Response(JSON.stringify({ error: "Failed to purchase number", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const purchased = await buyRes.json();

    // Update the stored config with the purchased number
    config.from_number = purchased.phone_number;
    const updatedEncrypted = await encrypt(JSON.stringify(config), encryptionKey);

    await adminClient
      .from("workspace_channel_settings")
      .update({
        config_encrypted: updatedEncrypted,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("channel", "sms");

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: purchased.phone_number,
        sid: purchased.sid,
        friendly_name: purchased.friendly_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("twilio-buy-number error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
