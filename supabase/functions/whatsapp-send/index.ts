import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { deductCredit } from "../_shared/credit-guard.ts";

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

type WhatsAppAttemptResult = {
  ok: boolean;
  data: any;
  phoneNumberId: string;
  source: "workspace" | "platform";
};

function buildWhatsAppError(waRes: Response, waData: any) {
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

  return { errMsg, graphCode, graphSubcode, isCredentialMismatch, isTokenOrPermissionError };
}

async function sendWhatsAppMessage(
  accessToken: string,
  rawPhoneNumberId: string,
  to: string,
  msgBody: string,
  source: "workspace" | "platform",
): Promise<WhatsAppAttemptResult> {
  const phoneNumberId = rawPhoneNumberId.replace(/[^\d]/g, "");

  if (phoneNumberId.length < 6) {
    throw new Error("WhatsApp configuration error: invalid Phone Number ID format.");
  }

  const waTo = to.startsWith("+") ? to.slice(1) : to;
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
  return { ok: waRes.ok, data: waData, phoneNumberId, source };
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

    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const user = { id: claimsData.claims.sub as string };

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const platformAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
    const platformPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

    const creds = await resolveChannelCredentials(workspaceId, "whatsapp", {
      access_token: platformAccessToken,
      phone_number_id: platformPhoneNumberId,
    });

    if (creds.source === "none" || !creds.config.access_token || !creds.config.phone_number_id) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured. Contact platform admin or set up your own in Settings → Channels." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let attempt = await sendWhatsAppMessage(
      creds.config.access_token.trim(),
      creds.config.phone_number_id.trim(),
      normalizedTo,
      msgBody,
      creds.source === "workspace" ? "workspace" : "platform",
    );

    if (!attempt.ok && attempt.source === "workspace" && platformAccessToken && platformPhoneNumberId) {
      const workspaceError = buildWhatsAppError(new Response(null, { status: 400 }), attempt.data);
      if (workspaceError.isCredentialMismatch || workspaceError.isTokenOrPermissionError) {
        console.warn("Workspace WhatsApp credentials failed, retrying with platform credentials", {
          workspaceId,
          graphCode: workspaceError.graphCode,
          graphSubcode: workspaceError.graphSubcode,
        });

        attempt = await sendWhatsAppMessage(
          platformAccessToken,
          platformPhoneNumberId,
          normalizedTo,
          msgBody,
          "platform",
        );
      }
    }

    if (!attempt.ok) {
      const { errMsg, graphCode, graphSubcode } = buildWhatsAppError(new Response(null, { status: 400 }), attempt.data);

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

      const isClientError = [190, 100, 10, 200, 131000, 131026, 131047, 131051].includes(graphCode) || graphCode === 0;
      return new Response(JSON.stringify({ success: false, error: errMsg, graphCode, graphSubcode }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waMessageId = attempt.data?.messages?.[0]?.id || null;

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

    if (campaignId && leadId && waMessageId) {
      await adminClient
        .from("campaign_messages")
        .update({ delivery_status: "delivered" })
        .eq("campaign_id", campaignId)
        .eq("lead_id", leadId)
        .eq("channel", "whatsapp")
        .eq("delivery_status", "pending");
    }

    return new Response(JSON.stringify({ success: true, waMessageId, credentialSource: attempt.source }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send WhatsApp message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
