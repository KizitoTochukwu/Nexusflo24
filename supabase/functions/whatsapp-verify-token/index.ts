import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptWhatsApp, decryptWhatsApp } from "../_shared/whatsapp-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function genToken(): string {
  // 32-char URL-safe hex token
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    const workspaceId =
      url.searchParams.get("workspaceId") ||
      (req.method === "POST"
        ? (await req.clone().json().catch(() => ({})))?.workspaceId
        : null);
    if (!workspaceId) return json({ error: "workspaceId required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin, error: adminErr } = await admin.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (adminErr || !isAdmin) return json({ error: "Forbidden" }, 403);

    const encKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encKey) return json({ error: "Server misconfigured" }, 500);

    if (req.method === "GET") {
      const { data: row, error } = await admin
        .from("whatsapp_settings")
        .select("verify_token_encrypted")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!row?.verify_token_encrypted) return json({ token: null });
      try {
        const plain = await decryptWhatsApp(row.verify_token_encrypted, encKey);
        return json({ token: plain });
      } catch (e) {
        return json({ error: "Failed to decrypt token" }, 500);
      }
    }

    if (req.method === "POST") {
      const newToken = genToken();
      const enc = await encryptWhatsApp(newToken, encKey);
      const { data: existing } = await admin
        .from("whatsapp_settings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (existing?.id) {
        const { error: upErr } = await admin
          .from("whatsapp_settings")
          .update({ verify_token_encrypted: enc })
          .eq("id", existing.id);
        if (upErr) return json({ error: upErr.message }, 500);
      } else {
        const { error: insErr } = await admin
          .from("whatsapp_settings")
          .insert({
            workspace_id: workspaceId,
            verify_token_encrypted: enc,
            is_active: false,
          });
        if (insErr) return json({ error: insErr.message }, 500);
      }
      return json({ token: newToken });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("whatsapp-verify-token error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
