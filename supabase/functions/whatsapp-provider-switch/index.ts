import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptWhatsApp, encryptChannelConfig } from "../_shared/whatsapp-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, provider } = (await req.json()) as {
      workspaceId?: string;
      provider?: "meta" | "twilio";
    };
    if (!workspaceId || !provider || !["meta", "twilio"].includes(provider)) {
      return new Response(JSON.stringify({ error: "workspaceId and provider are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
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
      return new Response(JSON.stringify({ error: "Only workspace admins can switch WhatsApp providers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "twilio") {
      const { data: row, error } = await admin
        .from("workspace_channel_settings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .eq("provider", "twilio")
        .maybeSingle();
      if (error) throw error;
      if (!row?.id) {
        return new Response(JSON.stringify({ error: "No saved Twilio WhatsApp credentials found." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updateErr } = await admin
        .from("workspace_channel_settings")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updateErr) throw updateErr;
    } else {
      const { data: settings, error } = await admin
        .from("whatsapp_settings")
        .select("id, phone_number_id, access_token_encrypted")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!settings?.id || !settings.phone_number_id || !settings.access_token_encrypted) {
        return new Response(JSON.stringify({ error: "No saved Meta Cloud API connection found." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const whatsappKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
      const channelKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
      if (whatsappKey && channelKey) {
        const accessToken = await decryptWhatsApp(settings.access_token_encrypted, whatsappKey);
        const configEncrypted = await encryptChannelConfig(
          JSON.stringify({ provider: "meta", phone_number_id: settings.phone_number_id, access_token: accessToken }),
          channelKey,
        );
        const { data: existingMeta } = await admin
          .from("workspace_channel_settings")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("channel", "whatsapp")
          .eq("provider", "meta")
          .maybeSingle();
        if (existingMeta?.id) {
          await admin
            .from("workspace_channel_settings")
            .update({ config_encrypted: configEncrypted, is_active: true, provider: "meta", updated_at: new Date().toISOString() })
            .eq("id", existingMeta.id);
        } else {
          await admin.from("workspace_channel_settings").insert({
            workspace_id: workspaceId,
            channel: "whatsapp",
            provider: "meta",
            config_encrypted: configEncrypted,
            is_active: true,
          });
        }
      }

      const { error: updateErr } = await admin
        .from("whatsapp_settings")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (updateErr) throw updateErr;
    }

    return new Response(JSON.stringify({ success: true, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-provider-switch error:", err);
    const message = err instanceof Error ? err.message : "Provider switch failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});