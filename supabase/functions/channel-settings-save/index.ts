import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToBase64(combined);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

const VALID_CHANNELS = ["email", "sms", "whatsapp"];

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

    const body = await req.json();
    const { workspaceId, channel, config, disconnect } = body;

    if (!workspaceId || !channel) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, channel" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return new Response(JSON.stringify({ error: "Invalid channel. Must be email, sms, or whatsapp." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify workspace admin
    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", { _user_id: user.id, _workspace_id: workspaceId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: workspace admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle disconnect — delete the row entirely
    if (disconnect) {
      const { error: delErr } = await adminClient
        .from("workspace_channel_settings")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("channel", channel);

      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true, disconnected: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!config) {
      return new Response(JSON.stringify({ error: "Missing config" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Encryption key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const configEncrypted = await encrypt(JSON.stringify(config), encryptionKey);

    const { error: upsertErr } = await adminClient
      .from("workspace_channel_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          channel,
          config_encrypted: configEncrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,channel" }
      );

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("channel-settings-save error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to save channel settings" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
