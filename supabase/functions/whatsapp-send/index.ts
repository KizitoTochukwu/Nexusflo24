import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  if (cleaned.startsWith("00")) { const intl = `+${cleaned.slice(2)}`; return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null; }
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  if (/^[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    const body = await req.json();
    const { workspaceId, to, type = "text", body: msgBody, leadId, campaignId } = body;

    if (!workspaceId || !to || !msgBody) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use E.164 format like +447517327597" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // If called with service role key (internal/campaign calls), skip user auth
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Resolve credentials: workspace-specific → platform ENV fallback
    const creds = await resolveChannelCredentials(workspaceId, "whatsapp", {
      access_token: Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
      phone_number_id: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"),
    });

    if (creds.source === "none" || !creds.config.access_token || !creds.config.phone_number_id) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured. Contact platform admin or set up your own in Settings → Channels." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = creds.config.access_token.trim();
    const rawPhoneNumberId = creds.config.phone_number_id.trim();
    const phoneNumberId = rawPhoneNumberId.replace(/[^\d]/g, "");

    if (phoneNumberId.length < 6) {
      return new Response(JSON.stringify({ error: "WhatsApp configuration error: invalid Phone Number ID format." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waTo = normalizedTo.startsWith("+") ? normalizedTo.slice(1) : normalizedTo;

    const waPayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "text",
      text: { body: msgBody },
    };

    const waRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waPayload),
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      const graphMessage = waData?.error?.message || `WhatsApp API error: ${waRes.status}`;
      const graphCode = Number(waData?.error?.code ?? 0);
      const graphSubcode = Number(waData?.error?.error_subcode ?? 0);
      const graphType = String(waData?.error?.type ?? "GraphMethodException");

      const isCredentialMismatch =
        /Unsupported post request|does not exist|missing permissions/i.test(graphMessage) ||
        (graphCode === 100 && /object with id|cannot find|not found/i.test(graphMessage));

      const isTokenOrPermissionError = graphCode === 190 || graphCode === 10 || graphCode === 200;

      const errMsg = isCredentialMismatch
        ? "WhatsApp credentials mismatch: the Phone Number ID and Access Token are not linked. Contact platform admin."
        : isTokenOrPermissionError
          ? "WhatsApp token is invalid, expired, or missing required permissions (whatsapp_business_messaging). Contact platform admin."
          : `[${graphType} ${graphCode}${graphSubcode ? `/${graphSubcode}` : ""}] ${graphMessage}`;

      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId,
        direction: "outbound",
        phone_number: normalizedTo,
        message_type: type,
        body: msgBody,
        status: "failed",
        error: errMsg,
        ...(leadId ? { lead_id: leadId } : {}),
      });

      const isClientError = [190, 100, 10, 200, 131000, 131026, 131047, 131051].includes(graphCode) || waRes.status === 400 || waRes.status === 401;
      return new Response(JSON.stringify({ success: false, error: errMsg, graphCode, graphSubcode }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waMessageId = waData?.messages?.[0]?.id || null;

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      wa_message_id: waMessageId,
      direction: "outbound",
      phone_number: normalizedTo,
      message_type: type,
      body: msgBody,
      status: "sent",
      ...(leadId ? { lead_id: leadId } : {}),
    });

    // If this was sent as part of a campaign, link the wa_message_id to the campaign_message
    if (campaignId && leadId && waMessageId) {
      await adminClient
        .from("campaign_messages")
        .update({ delivery_status: "delivered" })
        .eq("campaign_id", campaignId)
        .eq("lead_id", leadId)
        .eq("channel", "whatsapp")
        .eq("delivery_status", "pending");
    }

    return new Response(JSON.stringify({ success: true, waMessageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send WhatsApp message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
