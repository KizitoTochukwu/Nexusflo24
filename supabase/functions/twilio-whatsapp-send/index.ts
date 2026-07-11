// Twilio WhatsApp outbound sender — sibling to whatsapp-send (Meta).
// Called either directly by the in-app inbox/test, or routed from
// whatsapp-send when the workspace has provider="twilio".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";
import { normalizePhoneE164 as normalizePhone } from "../_shared/phone.ts";
import { notifyCredentialFailure } from "../_shared/credential-alert.ts";
import { resolveSenderProfile } from "../_shared/sender-resolver.ts";
import { logCommunicationUsage, getDeductionAmount, countryFromE164 } from "../_shared/usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function isMessagingServiceSid(v: string): boolean {
  return /^MG[0-9a-fA-F]{32}$/.test(v.trim());
}

function waAddress(num: string) {
  const clean = num.startsWith("whatsapp:") ? num.slice(9) : num;
  const e164 = clean.startsWith("+") ? clean : `+${clean.replace(/[^\d]/g, "")}`;
  return `whatsapp:${e164}`;
}

async function sendViaTwilioGateway(opts: {
  accountSid: string;
  authToken?: string;
  apiKey?: string; // connector connection key (X-Connection-Api-Key)
  from?: string;
  messagingServiceSid?: string;
  to: string;
  body: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}): Promise<{ ok: boolean; status: number; data: any }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = opts.apiKey || Deno.env.get("TWILIO_API_KEY");

  const buildParams = () => {
    const params = new URLSearchParams({ To: opts.to });
    if (opts.messagingServiceSid) {
      params.set("MessagingServiceSid", opts.messagingServiceSid);
    } else if (opts.from) {
      params.set("From", opts.from);
    }
    if (opts.contentSid) {
      params.set("ContentSid", opts.contentSid);
      if (opts.contentVariables) {
        params.set("ContentVariables", JSON.stringify(opts.contentVariables));
      }
    } else {
      params.set("Body", opts.body);
    }
    return params;
  };

  // Use gateway when available; otherwise fall back to direct Twilio Basic Auth.
  if (LOVABLE_API_KEY && connectionKey) {
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildParams().toString(),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // Direct Twilio fallback (workspace-supplied creds)
  if (!opts.accountSid || !opts.authToken) {
    return {
      ok: false,
      status: 500,
      data: { message: "Twilio credentials missing (account_sid + auth_token, or LOVABLE_API_KEY + TWILIO_API_KEY)" },
    };
  }
  const basic = btoa(`${opts.accountSid}:${opts.authToken}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(opts.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildParams().toString(),
    },
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    const body = await req.json();
    const {
      workspaceId,
      to,
      leadId,
      campaignId,
      template, // { name, language, components } — translated to Twilio Content API if contentSid present
      contentSid, // optional Twilio approved-template Content SID
      contentVariables,
      skipCredits,
      preview,
    } = body;

    let msgBody = htmlToPlainText(body?.body) || "";
    msgBody = msgBody.replace(
      /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\|[^}]*)?\s*\}\}/g,
      "",
    );
    if (preview && msgBody) msgBody = `[TEST] ${msgBody}`;

    if (!workspaceId || !to || (!msgBody && !contentSid)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: workspaceId, to, body (or contentSid)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use E.164 format." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    let callerUserId: string | undefined;
    if (!isServiceRole) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = claimsData.claims.sub as string;
      const { data: isMember } = await adminClient.rpc("is_workspace_member", {
        _user_id: callerUserId,
        _workspace_id: workspaceId,
      });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Credits
    let shouldDeductCredits = !preview;
    if (shouldDeductCredits && isServiceRole && skipCredits) {
      const { data: ws } = await adminClient
        .from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
      if (ws?.owner_user_id && (await isAdminUser(ws.owner_user_id))) {
        shouldDeductCredits = false;
      }
    }

    // Resolve sender profile (optional)
    const senderProfileId: string | null = (body as any).sender_profile_id || null;
    let resolvedSender: any = null;
    try {
      resolvedSender = await resolveSenderProfile(workspaceId, "whatsapp", senderProfileId);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || "Invalid sender profile" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toCountry = countryFromE164(normalizedTo);
    const deductAmount = shouldDeductCredits ? await getDeductionAmount("whatsapp", toCountry) : 0;
    if (shouldDeductCredits) {
      const creditResult = await deductCredit(workspaceId, "whatsapp", undefined, callerUserId, deductAmount);
      if (!creditResult.allowed) {
        return new Response(
          JSON.stringify({ error: creditResult.error || "Insufficient WhatsApp credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Prefer sender profile's Twilio WA SID if approved sender exists.
    const senderDetail = resolvedSender?.detail || null;
    const senderFrom = senderDetail?.twilio_wa_sender_sid || senderDetail?.phone_number || null;

    const creds = await resolveChannelCredentials(
      workspaceId,
      "whatsapp",
      {
        account_sid: Deno.env.get("TWILIO_ACCOUNT_SID"),
        auth_token: Deno.env.get("TWILIO_AUTH_TOKEN"),
        from_number:
          Deno.env.get("TWILIO_FROM_NUMBER") ||
          Deno.env.get("TWILIO_FROM_NUMBER_1"),
        messaging_service_sid: Deno.env.get("MESSAGING_SERVICE_SID"),
      },
      { mergePlatformDefaults: true },
    );

    const accountSid = (creds.config.account_sid || "").trim();
    const authToken = (creds.config.auth_token || "").trim();
    const fromCandidate = (
      senderFrom ||
      creds.config.from_number ||
      creds.config.messaging_service_sid ||
      ""
    ).trim();

    if (!fromCandidate || (!accountSid && !Deno.env.get("TWILIO_API_KEY"))) {
      const errMsg =
        "Twilio WhatsApp not configured. Add Account SID, Auth Token, and a WhatsApp-enabled From number (or Messaging Service SID) in Settings → Channels, or ask an admin to set platform defaults.";
      return new Response(
        JSON.stringify({ success: false, error: errMsg, provider: "twilio" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const useMessagingService = isMessagingServiceSid(fromCandidate);
    const From = useMessagingService ? undefined : waAddress(fromCandidate);
    const messagingServiceSid = useMessagingService ? fromCandidate : undefined;
    const To = waAddress(normalizedTo);

    console.log("[twilio-whatsapp-send] routing", {
      workspaceId,
      provider: "twilio",
      usingMessagingService: useMessagingService,
      fromHint: useMessagingService
        ? `${fromCandidate.slice(0, 4)}…${fromCandidate.slice(-4)}`
        : From
          ? `whatsapp:…${From.slice(-4)}`
          : null,
      toHint: `whatsapp:…${normalizedTo.slice(-4)}`,
      isTemplate: !!contentSid,
      preview: !!preview,
    });

    const sendRes = await sendViaTwilioGateway({
      accountSid,
      authToken,
      from: From,
      messagingServiceSid,
      to: To,
      body: msgBody,
      contentSid,
      contentVariables,
    });

    if (!sendRes.ok) {
      const errMsg =
        sendRes.data?.message ||
        sendRes.data?.error_message ||
        `Twilio error ${sendRes.status}`;
      const code = sendRes.data?.code || sendRes.status;

      console.warn("[twilio-whatsapp-send] provider error", {
        workspaceId, status: sendRes.status, code, errMsg,
      });

      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId,
        provider: "twilio",
        direction: "outbound",
        phone_number: normalizedTo,
        message_type: contentSid ? "template" : "text",
        body: msgBody || `[Template: ${contentSid}]`,
        status: "failed",
        error: errMsg,
        ...(leadId ? { lead_id: leadId } : {}),
      });

      // 24h window-equivalent in Twilio: error 63016 (freeform outside window)
      const isWindowClosed = code === 63016 || /outside.*allowed window/i.test(errMsg);

      // Credential / auth errors (20003 = auth, 20404 = not found)
      if (code === 20003 || code === 20404 || code === 401 || code === 403) {
        await notifyCredentialFailure({
          workspaceId,
          channel: "whatsapp",
          errorMessage: errMsg,
          meta: { provider: "twilio", source: "twilio-whatsapp-send", code },
        });
      }

      // Always return 200 so the caller can read the JSON error body.
      return new Response(
        JSON.stringify({
          success: false,
          provider: "twilio",
          error: errMsg,
          code,
          ...(isWindowClosed ? { fallback: true, reason: "window_closed" } : {}),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sid = sendRes.data?.sid || null;

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      provider: "twilio",
      provider_message_id: sid,
      direction: "outbound",
      phone_number: normalizedTo,
      message_type: contentSid ? "template" : "text",
      body: msgBody || `[Template: ${contentSid}]`,
      status: "sent",
      sender_profile_id: resolvedSender?.profile?.id || null,
      ...(leadId ? { lead_id: leadId } : {}),
    });

    if (!preview) {
      await logCommunicationUsage({
        workspaceId, channel: "whatsapp",
        senderProfileId: resolvedSender?.profile?.id || null,
        messageId: sid, country: toCountry,
        creditsDeducted: deductAmount, status: "sent",
      });
    }

    if (campaignId && leadId) {
      await adminClient
        .from("campaign_messages")
        .update({ delivery_status: "delivered" })
        .eq("campaign_id", campaignId)
        .eq("lead_id", leadId)
        .eq("channel", "whatsapp")
        .eq("delivery_status", "pending");
    }

    return new Response(
      JSON.stringify({ success: true, waMessageId: sid, provider: "twilio" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("twilio-whatsapp-send error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Twilio send failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
