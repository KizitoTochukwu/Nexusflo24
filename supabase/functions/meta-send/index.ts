import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptMeta } from "../_shared/meta-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

interface SendInput {
  workspace_id: string;
  platform: "instagram" | "facebook";
  // For DMs:
  recipient_id?: string;       // IGSID or PSID
  // For private replies to comments:
  comment_id?: string;
  message: string;
  lead_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const input = (await req.json()) as SendInput;
    const { workspace_id, platform, recipient_id, comment_id, message, lead_id } = input;

    if (!workspace_id || !platform || !message || (!recipient_id && !comment_id)) {
      return new Response(
        JSON.stringify({ error: "workspace_id, platform, message and (recipient_id or comment_id) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: settings } = await supabase
      .from("meta_settings")
      .select("page_id, ig_user_id, page_access_token_encrypted, is_active")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!settings || !settings.is_active || !settings.page_access_token_encrypted) {
      return new Response(
        JSON.stringify({ success: false, error: "Meta channel not configured for this workspace" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const encryptionKey = Deno.env.get("META_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Server not configured");

    const accessToken = await decryptMeta(settings.page_access_token_encrypted, encryptionKey);

    let url: string;
    let payload: Record<string, unknown>;

    if (platform === "instagram") {
      const igUserId = settings.ig_user_id;
      if (!igUserId) {
        return new Response(
          JSON.stringify({ success: false, error: "Instagram account not connected" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      url = `${GRAPH}/${igUserId}/messages?access_token=${encodeURIComponent(accessToken)}`;
      // Private reply to a comment uses recipient.comment_id; standard DM uses recipient.id (IGSID)
      payload = {
        recipient: comment_id ? { comment_id } : { id: recipient_id },
        message: { text: message },
      };
    } else {
      // Facebook Messenger Send API
      const pageId = settings.page_id;
      if (!pageId) {
        return new Response(
          JSON.stringify({ success: false, error: "Facebook Page not connected" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      url = `${GRAPH}/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`;
      payload = {
        recipient: comment_id ? { comment_id } : { id: recipient_id },
        message: { text: message },
        messaging_type: "RESPONSE",
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    const ok = res.ok && !data?.error;

    await supabase.from("social_messages").insert({
      workspace_id,
      lead_id: lead_id || null,
      platform,
      channel_type: comment_id ? "comment" : "dm",
      direction: "outbound",
      external_id: data?.message_id || data?.recipient_id || null,
      parent_comment_id: comment_id || null,
      sender_id: recipient_id || null,
      body: message,
      status: ok ? "sent" : "failed",
      error: ok ? null : JSON.stringify(data?.error || data),
    });

    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, error: data?.error?.message || "Send failed", details: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-send error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
