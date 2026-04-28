import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhoneNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  if (cleaned.startsWith("00")) {
    const intl = `+${cleaned.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null;
  }
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  if (/^[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

type TwilioSender =
  | { kind: "from"; value: string }
  | { kind: "messaging_service"; value: string };

function resolveTwilioSender(raw: string): TwilioSender | null {
  const trimmed = raw.trim();

  // Twilio Messaging Service SID (recommended for production routing)
  if (/^MG[0-9a-fA-F]{32}$/.test(trimmed)) {
    return { kind: "messaging_service", value: trimmed };
  }

  // If user pasted a whatsapp sender by mistake, strip protocol prefix for SMS validation
  const withoutWhatsAppPrefix = trimmed.replace(/^whatsapp:/i, "");

  // E.164 / local normalization path
  const normalized = normalizePhoneNumber(withoutWhatsAppPrefix);
  if (normalized) {
    return { kind: "from", value: normalized };
  }

  // Alphanumeric Sender ID (country-dependent support)
  if (/^[A-Za-z0-9][A-Za-z0-9 ]{0,10}$/.test(trimmed)) {
    return { kind: "from", value: trimmed };
  }

  return null;
}

async function sendTwilioSms(
  accountSid: string,
  authToken: string,
  sender: TwilioSender,
  to: string,
  body: string,
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const params = new URLSearchParams({ To: to, Body: body });

  if (sender.kind === "messaging_service") {
    params.set("MessagingServiceSid", sender.value);
  } else {
    params.set("From", sender.value);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Twilio error: ${res.status}`);
  return {
    providerMessageId: data.sid,
    status: data.status,
    from: data.from ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestBody: { workspaceId?: string; to?: string; message?: string } = {};

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    requestBody = await req.json();
    const { workspaceId, to } = requestBody;
    // Preview / test sends from the editor — skip credits + prefix [TEST].
    // Only honored for authenticated user calls (never service-role).
    const isPreview = (requestBody as any).preview === true;
    // SMS is a plain-text channel — strip any HTML that may have leaked in
    // from the rich-text editor (legacy automation/campaign steps store
    // contentEditable innerHTML).
    let message = htmlToPlainText(requestBody.message);
    // Strip any unresolved {{token}} so recipients never see literal placeholders.
    message = message ? message.replace(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\|[^}]*)?\s*\}\}/g, "") : message;
    if (isPreview && message) message = `[TEST] ${message}`;
    requestBody.message = message;

    if (!workspaceId || !to || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number format. Use international format like +447517327597." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // If called with service role key (internal/campaign calls), skip user auth
    let callerUserId: string | undefined;
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      // Validate JWT locally via signing-keys (JWKS). Avoids flaky /auth/v1/user 401s.
      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        console.error("sms-send auth failed:", claimsErr?.message);
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      callerUserId = claimsData.claims.sub as string;

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: callerUserId, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check and deduct credits — skip on preview tests, or if service-role + skipCredits + workspace owner is admin
    const skipCredits = (requestBody as any).skipCredits;
    let shouldDeductCredits = !isPreview;
    if (shouldDeductCredits && isServiceRole && skipCredits) {
      const { data: ws } = await adminClient.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
      if (ws?.owner_user_id && await isAdminUser(ws.owner_user_id)) {
        shouldDeductCredits = false;
      }
    }
    if (shouldDeductCredits) {
      const creditResult = await deductCredit(workspaceId, "sms", undefined, callerUserId);
      if (!creditResult.allowed) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient SMS credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Resolve credentials: workspace-specific → platform ENV fallback
    const creds = await resolveChannelCredentials(workspaceId, "sms", {
      account_sid: Deno.env.get("TWILIO_ACCOUNT_SID"),
      auth_token: Deno.env.get("TWILIO_AUTH_TOKEN"),
      from_number: Deno.env.get("TWILIO_FROM_NUMBER"),
    });

    if (creds.source === "none" || !creds.config.account_sid || !creds.config.auth_token || !creds.config.from_number) {
      return new Response(JSON.stringify({ error: "SMS provider not configured. Contact platform admin or set up your own in Settings → Channels." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accountSid = creds.config.account_sid;
    const authToken = creds.config.auth_token;
    const senderRaw = creds.config.from_number;

    const sender = resolveTwilioSender(senderRaw);
    if (!sender) {
      return new Response(JSON.stringify({ error: "Platform SMS sender is invalid. Set TWILIO_FROM_NUMBER to a valid E.164 number (e.g. +14155552671), Twilio Messaging Service SID (MG...), or supported alphanumeric sender ID." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (sender.kind === "from" && sender.value.startsWith("+") && normalizedTo === sender.value) {
      return new Response(JSON.stringify({ error: "'To' and 'From' number cannot be the same" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await sendTwilioSms(accountSid, authToken, sender, normalizedTo, message);

    // Log success
    await adminClient.from("sms_logs").insert({
      workspace_id: workspaceId,
      provider: "twilio",
      to_number: normalizedTo,
      from_number: sender.kind === "from" ? sender.value : result.from,
      message,
      status: "sent",
      provider_message_id: result.providerMessageId,
      direction: "outbound",
    });

    return new Response(JSON.stringify({ success: true, providerMessageId: result.providerMessageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("sms-send error:", err);

    try {
      if (requestBody.workspaceId) {
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("sms_logs").insert({
          workspace_id: requestBody.workspaceId,
          provider: "twilio",
          to_number: requestBody.to || "unknown",
          from_number: null,
          message: requestBody.message || "",
          status: "failed",
          error: err.message || "Unknown error",
        });
      }
    } catch (_) {
      /* ignore logging errors */
    }

    const errMsgRaw = err?.message || "Failed to send SMS";
    const isTwilioPairError = /current combination of 'To'.*'From'|and\/or 'From' parameters/i.test(errMsgRaw);
    const isGeoPermissionError = /Permission to send an SMS has not been enabled for the region/i.test(errMsgRaw);
    const isClientError =
      /Invalid 'To' Phone Number|Invalid 'From' Phone Number|cannot be the same/i.test(errMsgRaw) ||
      isTwilioPairError ||
      isGeoPermissionError;

    let errMsg = errMsgRaw;
    if (isGeoPermissionError) {
      const region = errMsgRaw.match(/\+(\d{1,4})/)?.[0] || "this region";
      errMsg = `Twilio has not enabled SMS for ${region}. Open Twilio Console → Messaging → Settings → Geo Permissions and enable the destination country, then retry. (Trial accounts must also verify the recipient number.)`;
    } else if (isTwilioPairError) {
      errMsg = "Twilio rejected this To/From combination. If your account is in trial mode, verify the recipient number in Twilio and ensure SMS permissions are enabled for that destination country.";
    }

    return new Response(JSON.stringify({ success: false, error: errMsg }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
