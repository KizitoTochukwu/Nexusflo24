import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function resolveResendKey(adminClient: any, workspaceId: string, encryptionKey: string): Promise<string | null> {
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function parseProviderError(response: Response, fallback: string) {
  try {
    const errJson = await response.json();
    return errJson?.message || errJson?.error || fallback;
  } catch {
    try {
      return (await response.text()) || fallback;
    } catch {
      return fallback;
    }
  }
}

async function fetchDomainStatus(domainId: string, resendHeaders: Record<string, string>) {
  const statusRes = await fetch(`https://api.resend.com/domains/${domainId}`, {
    headers: resendHeaders,
  });

  if (!statusRes.ok) {
    return null;
  }

  return await statusRes.json();
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

    const resendApiKey = await resolveResendKey(adminClient, workspaceId, encryptionKey);
    if (!resendApiKey) return jsonResponse({ error: "No Resend API key found. Save your email credentials first." }, 400);

    const resendHeaders = { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" };

    // ── ADD DOMAIN ──
    if (action === "add" && domain) {
      const addRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({ name: domain }),
      });

      if (!addRes.ok) {
        const errBody = await addRes.text();
        // Provide a user-friendly message for plan limits
        if (errBody.includes("Upgrade to add more")) {
          return jsonResponse({
            error: "Your Resend plan has reached its domain limit. Please upgrade your Resend plan or remove an existing domain before adding a new one.",
            details: errBody,
          }, 400);
        }
        return jsonResponse({ error: "Failed to add domain", details: errBody }, 502);
      }

      const domainData = await addRes.json();

      // Track ownership in workspace_domains
      await adminClient.from("workspace_domains").upsert({
        workspace_id: workspaceId,
        resend_domain_id: String(domainData.id),
        domain_name: domain,
        status: domainData.status || "pending",
      }, { onConflict: "workspace_id,resend_domain_id" });

      return jsonResponse({ success: true, domain: domainData });
    }

    // ── VERIFY DOMAIN ──
    if (action === "verify" && body.domainId) {
      // Enforce workspace ownership
      const { data: owned } = await adminClient
        .from("workspace_domains")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("resend_domain_id", String(body.domainId))
        .maybeSingle();

      if (!owned) return jsonResponse({ error: "Domain not found in this workspace" }, 403);

      const verifyRes = await fetch(`https://api.resend.com/domains/${body.domainId}/verify`, {
        method: "POST",
        headers: resendHeaders,
      });

      const domainData = await fetchDomainStatus(String(body.domainId), resendHeaders);
      if (domainData) {
        await adminClient
          .from("workspace_domains")
          .update({ status: domainData.status || "unknown" })
          .eq("workspace_id", workspaceId)
          .eq("resend_domain_id", String(body.domainId));
      }

      if (!verifyRes.ok) {
        let errMsg = await parseProviderError(verifyRes, "Verification failed");
        if (errMsg.toLowerCase().includes("dns")) {
          errMsg += " — DNS records may still be propagating. This can take up to 72 hours.";
        }
        return jsonResponse({ success: false, error: errMsg, domain: domainData });
      }

      return jsonResponse({ success: true, message: "Verification check complete", domain: domainData });
    }

    // ── DOMAIN STATUS ──
    if (action === "status" && body.domainId) {
      // Enforce workspace ownership
      const { data: owned } = await adminClient
        .from("workspace_domains")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("resend_domain_id", String(body.domainId))
        .maybeSingle();

      if (!owned) return jsonResponse({ error: "Domain not found in this workspace" }, 403);

      const statusData = await fetchDomainStatus(String(body.domainId), resendHeaders);

      if (!statusData) {
        return jsonResponse({ error: "Failed to get domain status" }, 502);
      }

      // Sync status back
      await adminClient
        .from("workspace_domains")
        .update({ status: statusData.status || "unknown" })
        .eq("workspace_id", workspaceId)
        .eq("resend_domain_id", String(body.domainId));

      return jsonResponse({ success: true, domain: statusData });
    }

    // ── LIST DOMAINS (workspace-scoped) ──
    if (action === "list") {
      // Only return domains owned by this workspace
      const { data: ownedDomains } = await adminClient
        .from("workspace_domains")
        .select("resend_domain_id, domain_name, status, created_at")
        .eq("workspace_id", workspaceId);

      if (!ownedDomains || ownedDomains.length === 0) {
        return jsonResponse({ success: true, domains: [] });
      }

      // Fetch live status from Resend for each owned domain
      const enriched = await Promise.all(
        ownedDomains.map(async (d) => {
          try {
            const res = await fetch(`https://api.resend.com/domains/${d.resend_domain_id}`, {
              headers: resendHeaders,
            });
            if (res.ok) {
              const live = await res.json();
              // Sync status
              if (live.status !== d.status) {
                await adminClient
                  .from("workspace_domains")
                  .update({ status: live.status })
                  .eq("workspace_id", workspaceId)
                  .eq("resend_domain_id", d.resend_domain_id);
              }
              return live;
            }
          } catch { /* fall through */ }
          // Return stored data if Resend call fails
          return { id: d.resend_domain_id, name: d.domain_name, status: d.status, created_at: d.created_at };
        })
      );

      return jsonResponse({ success: true, domains: enriched });
    }

    return jsonResponse({ error: "Invalid action. Use: add, verify, status, list" }, 400);
  } catch (err: any) {
    console.error("resend-domain-verify error:", err);
    return jsonResponse({ error: err?.message || "Failed" }, 500);
  }
});
