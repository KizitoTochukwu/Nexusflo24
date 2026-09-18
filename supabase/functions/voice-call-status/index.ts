/**
 * Twilio call status callback.
 *
 * Signature-verified, replay-safe: each status is stored once per call, the
 * session is closed out with its real duration, voice minutes are recorded,
 * and the call is synced into the CRM when it finishes.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { validateTwilioSignature } from "../_shared/voice-gateway-token.ts";
import { syncCallToCrm } from "../_shared/voiceCrm.ts";

const STATUS_MAP: Record<string, string> = {
  queued: "ringing",
  initiated: "ringing",
  ringing: "ringing",
  "in-progress": "in_progress",
  completed: "completed",
  busy: "busy",
  failed: "failed",
  "no-answer": "no_answer",
  canceled: "no_answer",
};


Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const raw = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

    const callSid = params.CallSid || "";
    if (!callSid) return new Response(null, { status: 204 });

    const { data: call } = await admin
      .from("voice_call_sessions")
      .select("id, workspace_id, status, duration_seconds, outcome")
      .eq("provider_call_id", callSid)
      .maybeSingle();
    if (!call) return new Response(null, { status: 204 });

    const creds = await resolveChannelCredentials(call.workspace_id, "sms", {
      account_sid: Deno.env.get("TWILIO_ACCOUNT_SID"),
      auth_token: Deno.env.get("TWILIO_AUTH_TOKEN"),
    });
    const authToken = String(creds.config.auth_token || Deno.env.get("TWILIO_AUTH_TOKEN") || "");
    const url = Deno.env.get("VOICE_STATUS_PUBLIC_URL") || req.url;
    const valid = await validateTwilioSignature(authToken, url, params, req.headers.get("x-twilio-signature"));
    if (!valid) {
      console.error("[voice-call-status] signature rejected for call", callSid);
      return new Response("Forbidden", { status: 403 });
    }

    const providerStatus = (params.CallStatus || "").toLowerCase();
    const status = STATUS_MAP[providerStatus] || call.status;
    const duration = Number(params.CallDuration || 0) || call.duration_seconds || 0;
    const finished = ["completed", "failed", "no_answer", "busy"].includes(status);

    // Store the raw status once.
    await admin.from("voice_call_events").insert({
      workspace_id: call.workspace_id,
      call_session_id: call.id,
      event_type: "provider_status",
      external_event_id: `${callSid}:status:${providerStatus}`,
      payload: { status: providerStatus, duration_seconds: duration },
    });

    await admin
      .from("voice_call_sessions")
      .update({
        status,
        duration_seconds: duration,
        ...(finished ? { ended_at: new Date().toISOString() } : {}),
      })
      .eq("id", call.id);

    if (finished && duration > 0) {
      // Minutes are recorded once per call.
      const { data: usage } = await admin
        .from("voice_usage_events")
        .select("id")
        .eq("call_session_id", call.id)
        .eq("usage_type", "call_minutes")
        .maybeSingle();
      if (!usage) {
        await admin.from("voice_usage_events").insert({
          workspace_id: call.workspace_id,
          call_session_id: call.id,
          usage_type: "call_minutes",
          seconds: duration,
        });
      }
      try {
        await syncCallToCrm(admin, call.id);
      } catch (err) {
        console.error("[voice-call-status] crm sync failed", err);
      }
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[voice-call-status] error", err);
    return new Response(null, { status: 204 });
  }
});
