import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
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

    const { workspaceId, friendlyName } = await req.json();
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify workspace admin
    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", {
      _user_id: user.id,
      _workspace_id: workspaceId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: workspace admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get platform Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: "Platform Twilio credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch workspace name for friendly name
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    const subaccountName = friendlyName || workspace?.name || `NexusFlo24-${workspaceId.slice(0, 8)}`;

    // Create Twilio Subaccount
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ FriendlyName: subaccountName }),
      }
    );

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text();
      console.error("Twilio subaccount creation failed:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create Twilio subaccount", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subaccount = await twilioRes.json();

    // Encrypt and store the subaccount credentials as workspace SMS channel settings
    const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Encryption key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smsConfig = {
      account_sid: subaccount.sid,
      auth_token: subaccount.auth_token,
      from_number: "", // Will be provisioned separately
      subaccount: true,
      friendly_name: subaccount.friendly_name,
    };

    const configEncrypted = await encrypt(JSON.stringify(smsConfig), encryptionKey);

    const { error: upsertErr } = await adminClient
      .from("workspace_channel_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          channel: "sms",
          config_encrypted: configEncrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,channel" }
      );

    if (upsertErr) throw upsertErr;

    // List available phone numbers (US by default, first available)
    const numbersRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccount.sid}/AvailablePhoneNumbers/US/Local.json?PageSize=5`,
      {
        headers: {
          Authorization: "Basic " + btoa(`${subaccount.sid}:${subaccount.auth_token}`),
        },
      }
    );

    let availableNumbers: any[] = [];
    if (numbersRes.ok) {
      const numbersData = await numbersRes.json();
      availableNumbers = (numbersData.available_phone_numbers || []).map((n: any) => ({
        phone_number: n.phone_number,
        friendly_name: n.friendly_name,
        locality: n.locality,
        region: n.region,
      }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        subaccount_sid: subaccount.sid,
        friendly_name: subaccount.friendly_name,
        available_numbers: availableNumbers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("twilio-provision-subaccount error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to provision subaccount" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
