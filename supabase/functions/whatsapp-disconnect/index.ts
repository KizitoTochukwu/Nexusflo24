// Disconnects a workspace's WhatsApp connection: deactivates whatsapp_settings,
// nukes the matching workspace_channel_settings row, and (best-effort) calls
// Meta to unsubscribe our app from the WABA so they stop receiving our webhooks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptWhatsApp } from "../_shared/whatsapp-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const whatsappKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");

    const { workspaceId } = (await req.json()) as { workspaceId?: string };
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await admin.rpc("is_workspace_admin", {
      _user_id: claims.claims.sub,
      _workspace_id: workspaceId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only workspace admins can disconnect" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("whatsapp_settings")
      .select("id, waba_id, access_token_encrypted")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Best-effort unsubscribe from Meta.
    if (whatsappKey && settings?.waba_id && settings?.access_token_encrypted) {
      try {
        const accessToken = await decryptWhatsApp(settings.access_token_encrypted, whatsappKey);
        await fetch(`${GRAPH}/${encodeURIComponent(settings.waba_id)}/subscribed_apps`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (err) {
        console.warn("Meta unsubscribe failed (continuing):", (err as Error).message);
      }
    }

    if (settings?.id) {
      await admin
        .from("whatsapp_settings")
        .update({ is_active: false })
        .eq("id", settings.id);
    }

    await admin
      .from("workspace_channel_settings")
      .update({ is_active: false })
      .eq("workspace_id", workspaceId)
      .eq("channel", "whatsapp");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-disconnect error:", err);
    const message = err instanceof Error ? err.message : "Disconnect failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
