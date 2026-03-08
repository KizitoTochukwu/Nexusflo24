import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhoneNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  if (cleaned.startsWith("00")) { const intl = `+${cleaned.slice(2)}`; return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null; }
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  if (/^[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

async function sendTwilioSms(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Twilio error: ${res.status}`);
  return { providerMessageId: data.sid, status: data.status };
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
    const { workspaceId, to, message } = body;

    if (!workspaceId || !to || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number format. Use international format like +447517327597." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Platform-managed credentials from ENV
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(JSON.stringify({ error: "SMS provider not configured. Contact platform admin." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedFrom = normalizePhoneNumber(fromNumber);
    if (!normalizedFrom) {
      return new Response(JSON.stringify({ error: "Platform SMS From Number is invalid." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (normalizedTo === normalizedFrom) {
      return new Response(JSON.stringify({ error: "'To' and 'From' number cannot be the same" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await sendTwilioSms(accountSid, authToken, normalizedFrom, normalizedTo, message);

    // Log success
    await adminClient.from("sms_logs").insert({
      workspace_id: workspaceId,
      provider: "twilio",
      to_number: normalizedTo,
      from_number: normalizedFrom,
      message,
      status: "sent",
      provider_message_id: result.providerMessageId,
    });

    return new Response(JSON.stringify({ success: true, providerMessageId: result.providerMessageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("sms-send error:", err);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.workspaceId) {
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("sms_logs").insert({
          workspace_id: body.workspaceId,
          provider: "twilio",
          to_number: body.to || "unknown",
          from_number: null,
          message: body.message || "",
          status: "failed",
          error: err.message || "Unknown error",
        });
      }
    } catch (_) { /* ignore logging errors */ }

    const errMsgRaw = err?.message || "Failed to send SMS";
    const isTwilioPairError = /current combination of 'To'.*'From'|and\/or 'From' parameters/i.test(errMsgRaw);
    const isClientError = /Invalid 'To' Phone Number|Invalid 'From' Phone Number|cannot be the same/i.test(errMsgRaw) || isTwilioPairError;
    const errMsg = isTwilioPairError
      ? "Twilio rejected this To/From combination. If your account is in trial mode, verify the recipient number in Twilio and ensure SMS permissions are enabled for that destination country."
      : errMsgRaw;

    return new Response(JSON.stringify({ success: false, error: errMsg }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
