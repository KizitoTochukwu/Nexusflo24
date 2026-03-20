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
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const combined = base64ToBytes(cipherB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
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

    const body = await req.json();
    const { workspaceId, action, domain } = body;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), {
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

    // Get the workspace's Resend API key from channel settings
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
      .eq("channel", "email")
      .eq("is_active", true)
      .maybeSingle();

    let resendApiKey: string | null = null;

    if (channelRow?.config_encrypted) {
      const config = JSON.parse(await decrypt(channelRow.config_encrypted, encryptionKey));
      resendApiKey = config.api_key || null;
    }

    // Fallback to platform key
    if (!resendApiKey) {
      resendApiKey = Deno.env.get("RESEND_API_KEY") || null;
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "No Resend API key found. Save your email credentials first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendHeaders = {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    };

    // Action: add domain
    if (action === "add" && domain) {
      const addRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({ name: domain }),
      });

      if (!addRes.ok) {
        const errBody = await addRes.text();
        return new Response(JSON.stringify({ error: "Failed to add domain", details: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const domainData = await addRes.json();
      return new Response(JSON.stringify({ success: true, domain: domainData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: verify (trigger re-check)
    if (action === "verify" && body.domainId) {
      const verifyRes = await fetch(`https://api.resend.com/domains/${body.domainId}/verify`, {
        method: "POST",
        headers: resendHeaders,
      });

      if (!verifyRes.ok) {
        const errBody = await verifyRes.text();
        return new Response(JSON.stringify({ error: "Verification failed", details: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Verification initiated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: status (get domain info)
    if (action === "status" && body.domainId) {
      const statusRes = await fetch(`https://api.resend.com/domains/${body.domainId}`, {
        headers: resendHeaders,
      });

      if (!statusRes.ok) {
        const errBody = await statusRes.text();
        return new Response(JSON.stringify({ error: "Failed to get domain status", details: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusData = await statusRes.json();
      return new Response(JSON.stringify({ success: true, domain: statusData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list (list all domains)
    if (action === "list") {
      const listRes = await fetch("https://api.resend.com/domains", {
        headers: resendHeaders,
      });

      if (!listRes.ok) {
        const errBody = await listRes.text();
        return new Response(JSON.stringify({ error: "Failed to list domains", details: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const listData = await listRes.json();
      return new Response(JSON.stringify({ success: true, domains: listData.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: add, verify, status, list" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("resend-domain-verify error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
