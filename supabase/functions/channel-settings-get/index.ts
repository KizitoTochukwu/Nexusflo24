import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
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

function maskValue(val: string | undefined | null): string {
  if (!val) return "";
  if (val.length <= 6) return "****";
  return val.slice(0, 4) + "..." + val.slice(-4);
}

// Fields safe to return in plaintext for form prefill (non-secret).
const NON_SECRET_FIELDS: Record<string, string[]> = {
  email: ["provider", "from_email", "from_name", "reply_to"],
  sms: ["from_number"],
  whatsapp: ["provider", "phone_number_id", "account_sid", "from_number", "messaging_service_sid"],
};


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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", { _user_id: user.id, _workspace_id: workspaceId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rows } = await adminClient
      .from("workspace_channel_settings")
      .select("channel, provider, is_active, config_encrypted, updated_at")
      .eq("workspace_id", workspaceId);

    const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");

    const channels: Record<string, any> = {};

    for (const row of rows || []) {
      let masked: Record<string, string> = {};
      let non_secret: Record<string, string> = {};
      if (encryptionKey && row.config_encrypted) {
        try {
          const config = JSON.parse(await decrypt(row.config_encrypted, encryptionKey));
          const safeKeys = NON_SECRET_FIELDS[row.channel] || [];
          for (const [k, v] of Object.entries(config)) {
            masked[k] = maskValue(v as string);
            if (safeKeys.includes(k) && typeof v === "string") non_secret[k] = v;
          }
        } catch {
          masked = { error: "decryption_failed" };
        }
      }
      const channelPayload = {
        configured: true,
        is_active: row.is_active,
        provider: row.provider || non_secret.provider || null,
        masked,
        non_secret,
        updated_at: row.updated_at,
      };

      if (row.channel === "whatsapp") {
        const provider = String(row.provider || non_secret.provider || "meta").toLowerCase();
        channels.whatsapp_by_provider = channels.whatsapp_by_provider || {};
        channels.whatsapp_by_provider[provider] = channelPayload;

        if (!channels.whatsapp || row.is_active || provider === "twilio") {
          channels.whatsapp = channelPayload;
        }
        continue;
      }

      channels[row.channel] = channelPayload;
    }

    // Fill unconfigured channels
    for (const ch of ["email", "sms", "whatsapp"]) {
      if (!channels[ch]) {
        channels[ch] = { configured: false, is_active: false, masked: {}, non_secret: {}, updated_at: null };
      }
    }

    channels.whatsapp_by_provider = channels.whatsapp_by_provider || {};
    for (const provider of ["meta", "twilio"]) {
      if (!channels.whatsapp_by_provider[provider]) {
        channels.whatsapp_by_provider[provider] = {
          configured: false,
          is_active: false,
          provider,
          masked: {},
          non_secret: { provider },
          updated_at: null,
        };
      }
    }


    return new Response(JSON.stringify(channels), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("channel-settings-get error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to get channel settings" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
