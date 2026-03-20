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

async function getResendApiKey(adminClient: any, workspaceId: string, encryptionKey: string): Promise<string | null> {
  const { data: channelRow } = await adminClient
    .from("workspace_channel_settings")
    .select("config_encrypted")
    .eq("workspace_id", workspaceId)
    .eq("channel", "email")
    .eq("is_active", true)
    .maybeSingle();

  if (channelRow?.config_encrypted) {
    const config = JSON.parse(await decrypt(channelRow.config_encrypted, encryptionKey));
    if (config.api_key) return config.api_key;
  }

  return Deno.env.get("RESEND_API_KEY") || null;
}

async function verifyDomainOwnership(adminClient: any, workspaceId: string, domainId: string): Promise<boolean> {
  const { data } = await adminClient
    .from("workspace_domains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("resend_domain_id", domainId)
    .maybeSingle();
  return !!data;
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { workspaceId, action, domain } = body;
    if (!workspaceId) return jsonResponse({ error: "Missing workspaceId" }, 400);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isAdmin } = await adminClient.rpc("is_workspace_admin", {
      _user_id: user.id,
      _workspace_id: workspaceId,
    });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) return jsonResponse({ error: "Encryption key not configured" }, 500);

    const resendApiKey = await getResendApiKey(adminClient, workspaceId, encryptionKey);
    if (!resendApiKey) return jsonResponse({ error: "No Resend API key found. Save your email credentials first." }, 400);

    const resendHeaders = {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    };

    // === ADD DOMAIN ===
    if (action === "add" && domain) {
      const addRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({ name: domain }),
      });

      if (!addRes.ok) {
        const errBody = await addRes.text();
        return jsonResponse({ error: "Failed to add domain", details: errBody }, 502);
      }

      const domainData = await addRes.json();

      // Store domain ownership mapping
      await adminClient.from("workspace_domains").upsert({
        workspace_id: workspaceId,
        resend_domain_id: String(domainData.id),
        domain_name: domain,
        status: domainData.status || "pending",
      }, { onConflict: "workspace_id,resend_domain_id" });

      return jsonResponse({ success: true, domain: domainData });
    }

    // === VERIFY DOMAIN ===
    if (action === "verify" && body.domainId) {
      const owned = await verifyDomainOwnership(adminClient, workspaceId, String(body.domainId));
      if (!owned) return jsonResponse({ error: "Domain not found in this workspace" }, 403);

      const verifyRes = await fetch(`https://api.resend.com/domains/${body.domainId}/verify`, {
        method: "POST",
        headers: resendHeaders,
      });

      if (!verifyRes.ok) {
        const errBody = await verifyRes.text();
        return jsonResponse({ error: "Verification failed", details: errBody }, 502);
      }

      return jsonResponse({ success: true, message: "Verification initiated" });
    }

    // === DOMAIN STATUS ===
    if (action === "status" && body.domainId) {
      const owned = await verifyDomainOwnership(adminClient, workspaceId, String(body.domainId));
      if (!owned) return jsonResponse({ error: "Domain not found in this workspace" }, 403);

      const statusRes = await fetch(`https://api.resend.com/domains/${body.domainId}`, {
        headers: resendHeaders,
      });

      if (!statusRes.ok) {
        const errBody = await statusRes.text();
        return jsonResponse({ error: "Failed to get domain status", details: errBody }, 502);
      }

      const statusData = await statusRes.json();

      // Keep local status in sync
      await adminClient.from("workspace_domains")
        .update({ status: statusData.status || "unknown" })
        .eq("workspace_id", workspaceId)
        .eq("resend_domain_id", String(body.domainId));

      return jsonResponse({ success: true, domain: statusData });
    }

    // === LIST DOMAINS (workspace-scoped) ===
    if (action === "list") {
      // Only return domains owned by this workspace
      const { data: ownedDomains } = await adminClient
        .from("workspace_domains")
        .select("resend_domain_id, domain_name, status")
        .eq("workspace_id", workspaceId);

      if (!ownedDomains || ownedDomains.length === 0) {
        return jsonResponse({ success: true, domains: [] });
      }

      // Fetch fresh status from Resend for each owned domain
      const domains = await Promise.all(
        ownedDomains.map(async (d) => {
          try {
            const res = await fetch(`https://api.resend.com/domains/${d.resend_domain_id}`, {
              headers: resendHeaders,
            });
            if (res.ok) {
              const fresh = await res.json();
              // Sync status back
              await adminClient.from("workspace_domains")
                .update({ status: fresh.status || "unknown" })
                .eq("workspace_id", workspaceId)
                .eq("resend_domain_id", d.resend_domain_id);
              return fresh;
            }
          } catch { /* fall through to cached data */ }
          // Return cached data if Resend call fails
          return { id: d.resend_domain_id, name: d.domain_name, status: d.status };
        })
      );

      return jsonResponse({ success: true, domains });
    }

    return jsonResponse({ error: "Invalid action. Use: add, verify, status, list" }, 400);
  } catch (err: any) {
    console.error("resend-domain-verify error:", err);
    return jsonResponse({ error: err?.message || "Failed" }, 500);
  }
});
