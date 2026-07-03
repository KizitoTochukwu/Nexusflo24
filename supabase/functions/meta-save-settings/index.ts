import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptMeta } from "../_shared/meta-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const {
      workspace_id,
      page_id,
      page_name,
      ig_user_id,
      ig_username,
      page_access_token,
      verify_token,
      fb_user_id,
      fb_user_name,
      connection_method = "manual",
    } = body || {};

    if (!workspace_id || !page_access_token || !verify_token) {
      return new Response(
        JSON.stringify({ error: "workspace_id, page_access_token and verify_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify caller is workspace admin
    const { data: isAdmin } = await supabase.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspace_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only workspace admins can configure Meta settings" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encryptionKey = Deno.env.get("META_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Server not configured (encryption key missing)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const page_access_token_encrypted = await encryptMeta(page_access_token, encryptionKey);
    const verify_token_encrypted = await encryptMeta(verify_token, encryptionKey);

    const payload: Record<string, unknown> = {
      workspace_id,
      page_id: page_id || null,
      page_name: page_name || null,
      ig_user_id: ig_user_id || null,
      ig_username: ig_username || null,
      page_access_token_encrypted,
      verify_token_encrypted,
      fb_user_id: fb_user_id || null,
      fb_user_name: fb_user_name || null,
      connection_method,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("meta_settings")
      .select("id")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("meta_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("meta_settings").insert(payload);
      if (error) throw error;
    }

    // Best-effort: subscribe the Facebook Page to leadgen + messages + feed webhooks
    // so Facebook Lead Ads flow into meta-webhook automatically. Non-fatal if it fails
    // (e.g. token missing pages_manage_metadata scope) — the settings still save.
    if (page_id && page_access_token) {
      try {
        const subUrl = `https://graph.facebook.com/v20.0/${page_id}/subscribed_apps?access_token=${encodeURIComponent(page_access_token)}`;
        const subRes = await fetch(subUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ subscribed_fields: "leadgen,messages,feed,messaging_postbacks" }),
        });
        if (!subRes.ok) {
          console.warn("meta-save-settings: page webhook subscribe failed", subRes.status, await subRes.text());
        }
      } catch (subErr) {
        console.warn("meta-save-settings: page webhook subscribe error", subErr);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-save-settings error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
