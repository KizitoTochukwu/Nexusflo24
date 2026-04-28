import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";

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

interface TemplatePayload {
  name: string;
  language: string;
  components?: Array<Record<string, unknown>>;
}

async function sendWhatsAppMessage(
  accessToken: string,
  rawPhoneNumberId: string,
  to: string,
  msgBody: string,
  source: "workspace" | "platform",
  template?: TemplatePayload,
): Promise<WhatsAppAttemptResult> {
  const phoneNumberId = rawPhoneNumberId.replace(/[^\d]/g, "");

  if (phoneNumberId.length < 6) {
    throw new Error("WhatsApp configuration error: invalid Phone Number ID format.");
  }

  const waTo = to.startsWith("+") ? to.slice(1) : to;

  let waPayload: Record<string, unknown>;
  if (template) {
    waPayload = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language || "en" },
        ...(template.components ? { components: template.components } : {}),
      },
    };
  } else {
    waPayload = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "text",
      text: { body: msgBody },
    };
  }

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

/** Check if the 24-hour conversation window is open for a given phone number */
async function isWindowOpen(
  adminClient: any,
  workspaceId: string,
  phoneNumber: string,
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await adminClient
    .from("whatsapp_messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", phoneNumber)
    .eq("direction", "inbound")
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);

  return Boolean(data && data.length > 0);
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
    const { workspaceId, to, type = "text", leadId, campaignId, template, skipCredits } = body;
    // Preview / test sends from the editor — skip credits + prefix [TEST].
    const isPreview = (body as any).preview === true;
    // WhatsApp text messages are plain-text — strip any HTML that may have
    // leaked in from the rich-text editor (legacy automation/campaign steps
    // store contentEditable innerHTML which renders literally on WhatsApp).
    let msgBody = htmlToPlainText(body?.body);
    // Strip any unresolved {{token}} so recipients never see literal placeholders.
    msgBody = msgBody ? msgBody.replace(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\|[^}]*)?\s*\}\}/g, "") : msgBody;
    if (isPreview && msgBody) msgBody = `[TEST] ${msgBody}`;

    if (!workspaceId || !to || (!msgBody && !template)) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, body (or template)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use E.164 format like +447517327597" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    let callerUserId: string | undefined;
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const user = { id: claimsData.claims.sub as string };
      callerUserId = user.id;

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check and deduct credits — skip on preview tests, or if service-role + skipCredits + workspace owner is admin
    let shouldDeductCredits = !isPreview;
    if (shouldDeductCredits && isServiceRole && skipCredits) {
      const { data: ws } = await adminClient.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
      if (ws?.owner_user_id && await isAdminUser(ws.owner_user_id)) {
        shouldDeductCredits = false;
      }
    }
    if (shouldDeductCredits) {
      const creditResult = await deductCredit(workspaceId, "whatsapp", undefined, callerUserId);
      if (!creditResult.allowed) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient WhatsApp credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // 24h re-engagement window check.
    // WhatsApp Cloud API ONLY allows free-form text when the recipient has
    // messaged your business in the last 24h. Outside that window the only
    // way to reach them is an APPROVED template (not free text, not the
    // generic Meta `hello_world` placeholder which would deliver "Hello
    // World" instead of the user's content — confusing recipients and
    // hiding delivery failures from the sender).
    //
    // Behavior:
    //   • caller provided a template          → send the template
    //   • free-form msg + window OPEN         → send the text
    //   • free-form msg + window CLOSED       → fail fast with a structured
    //                                           `fallback:true` signal so
    //                                           callers (campaign /
    //                                           automation / inbox) can
    //                                           switch to SMS / Email /
    //                                           prompt the user to pick an
    //                                           approved template.
    let effectiveTemplate = template;
    const autoTemplated = false; // legacy field kept in response for back-compat

    if (!template && msgBody) {
      const windowOpen = await isWindowOpen(adminClient, workspaceId, normalizedTo);
      if (!windowOpen) {
        const errMsg = "WhatsApp 24h window closed — recipient has not messaged you in 24h. Send an approved template, switch channels, or wait for a reply.";
        console.warn("WA window closed", { workspaceId, to: normalizedTo });

        await adminClient.from("whatsapp_messages").insert({
          workspace_id: workspaceId,
          direction: "outbound",
          phone_number: normalizedTo,
          message_type: "text",
          body: msgBody,
          status: "failed",
          error: errMsg,
          ...(leadId ? { lead_id: leadId } : {}),
        });

        if (campaignId && leadId) {
          await adminClient.from("campaign_messages")
            .update({ delivery_status: "failed", error: errMsg })
            .eq("campaign_id", campaignId)
            .eq("lead_id", leadId)
            .eq("channel", "whatsapp")
            .eq("delivery_status", "pending");
        }

        // HTTP 200 + structured payload so the caller's `error` branch in
        // supabase.functions.invoke is NOT triggered — the caller reads
        // `success === false && fallback === true` and routes to fallback.
        return new Response(JSON.stringify({
          success: false,
          fallback: true,
          reason: "window_closed",
          error: errMsg,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let attempt = await sendWhatsAppMessage(
      creds.config.access_token.trim(),
      creds.config.phone_number_id.trim(),
      normalizedTo,
      msgBody || `[Template: ${effectiveTemplate?.name}]`,
      creds.source === "workspace" ? "workspace" : "platform",
      effectiveTemplate,
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
          msgBody || `[Template: ${effectiveTemplate?.name}]`,
          "platform",
          effectiveTemplate,
        );
      }
    }

    if (!attempt.ok) {
      const { errMsg, graphCode, graphSubcode } = buildWhatsAppError(new Response(null, { status: 400 }), attempt.data);

      const logBody = msgBody || `[Template: ${effectiveTemplate?.name}]`;
      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId,
        direction: "outbound",
        phone_number: normalizedTo,
        message_type: effectiveTemplate ? "template" : type,
        body: logBody,
        status: "failed",
        error: errMsg,
        ...(leadId ? { lead_id: leadId } : {}),
      });

      const isClientError = [190, 100, 10, 200, 131000, 131026, 131047, 131051].includes(graphCode) || graphCode === 0;
      return new Response(JSON.stringify({ success: false, error: errMsg, graphCode, graphSubcode }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waMessageId = attempt.data?.messages?.[0]?.id || null;

    // Log the original message body even if auto-templated
    const sentLogBody = autoTemplated
      ? `${msgBody} [auto-sent as template: ${effectiveTemplate?.name}]`
      : (msgBody || `[Template: ${effectiveTemplate?.name}]`);

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      wa_message_id: waMessageId,
      direction: "outbound",
      phone_number: normalizedTo,
      message_type: effectiveTemplate ? "template" : type,
      body: sentLogBody,
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

    return new Response(JSON.stringify({ success: true, waMessageId, credentialSource: attempt.source, autoTemplated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send WhatsApp message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
