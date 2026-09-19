/**
 * Inbound telephone webhook (Twilio Programmable Voice).
 *
 * Twilio POSTs here when one of the workspace's voice numbers rings. The
 * request signature is verified before anything is written. One call session
 * is created per provider call id (replays are safe), and the caller is either
 * connected to the voice gateway with a short-lived signed token, or given an
 * honest fallback (transfer, or a promise of a call back) when the workspace
 * is not ready to answer with AI.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { signGatewayToken, validateTwilioSignature, escapeXml } from "../_shared/voice-gateway-token.ts";

const TOKEN_TTL_SECONDS = 600; // one call setup, not a session key

const twiml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });

const say = (text: string) => `<Say voice="Polly.Amy">${escapeXml(text)}</Say>`;

function gatewayWsUrl(token: string): string | null {
  const base = (Deno.env.get("VOICE_GATEWAY_URL") || "").trim();
  if (!base) return null;
  const url = base.replace(/^http:/, "ws:").replace(/^https:/, "wss:").replace(/\/+$/, "");
  return `${url}/twilio?token=${encodeURIComponent(token)}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const raw = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

    const callSid = params.CallSid || "";
    const from = params.From || "";
    const to = params.To || "";
    if (!callSid || !to) return twiml(say("Sorry, this call could not be connected."));

    // Which workspace owns the dialled number?
    const { data: number } = await admin
      .from("voice_phone_numbers")
      .select("id, workspace_id, assistant_id, forward_to_number")
      .eq("phone_number", to)
      .maybeSingle();

    if (!number) {
      console.warn("[voice-inbound-call] unknown number", to);
      return twiml(say("Sorry, this number is not in service."));
    }

    // Verify the request really came from Twilio, using this workspace's account.
    const creds = await resolveChannelCredentials(number.workspace_id, "sms", {
      account_sid: Deno.env.get("TWILIO_ACCOUNT_SID"),
      auth_token: Deno.env.get("TWILIO_AUTH_TOKEN"),
    });
    const authToken = String(creds.config.auth_token || Deno.env.get("TWILIO_AUTH_TOKEN") || "");
    const signature = req.headers.get("x-twilio-signature");
    const url = Deno.env.get("VOICE_INBOUND_PUBLIC_URL") || req.url;
    const valid = await validateTwilioSignature(authToken, url, params, signature);
    if (!valid) {
      console.error("[voice-inbound-call] signature rejected for call", callSid);
      return new Response("Forbidden", { status: 403 });
    }

    const { data: settings } = await admin
      .from("voice_settings")
      .select("enabled, recording_enabled, transfer_number, max_concurrent_calls")
      .eq("workspace_id", number.workspace_id)
      .maybeSingle();

    const { data: assistant } = number.assistant_id
      ? await admin
        .from("voice_assistants")
        .select("id, status, config, runtime_prompt, published_version")
        .eq("id", number.assistant_id)
        .maybeSingle()
      : { data: null };

    // One session per provider call id — Twilio retries are safe.
    const { data: existing } = await admin
      .from("voice_call_sessions")
      .select("id")
      .eq("provider_call_id", callSid)
      .maybeSingle();

    let sessionId = existing?.id as string | undefined;
    if (!sessionId) {
      const { data: created, error } = await admin
        .from("voice_call_sessions")
        .insert({
          workspace_id: number.workspace_id,
          assistant_id: number.assistant_id,
          phone_number_id: number.id,
          provider: "twilio",
          provider_call_id: callSid,
          direction: "inbound",
          from_number: from || null,
          to_number: to,
          status: "ringing",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (error) console.error("[voice-inbound-call] session insert failed", error.message);
      sessionId = created?.id;
    }

    const logEvent = async (type: string, payload: Record<string, unknown> = {}) => {
      if (!sessionId) return;
      await admin.from("voice_call_events").insert({
        workspace_id: number.workspace_id,
        call_session_id: sessionId,
        event_type: type,
        external_event_id: `${callSid}:${type}`,
        payload,
      });
    };

    const fallback = async (reason: string, spoken: string) => {
      await logEvent("fallback", { reason });
      if (sessionId) {
        await admin
          .from("voice_call_sessions")
          .update({ status: "in_progress", outcome: reason === "transfer" ? "transferred" : "no_answer" })
          .eq("id", sessionId);
      }
      const transferTo = number.forward_to_number || settings?.transfer_number;
      if (transferTo) {
        return twiml(`${say(spoken)}<Dial>${escapeXml(transferTo)}</Dial>`);
      }
      return twiml(`${say(spoken)}<Hangup/>`);
    };

    if (!settings?.enabled) {
      return await fallback("voice_disabled", "Thanks for calling. Nobody is available to take your call right now, so please leave us a message by email and we will come back to you.");
    }
    if (!assistant || assistant.status !== "active" || !assistant.runtime_prompt) {
      return await fallback("assistant_not_live", "Thanks for calling. Our assistant is not available at the moment — please hold while we try to put you through.");
    }

    // Concurrency cap, enforced on the server.
    const maxConcurrent = Number(settings.max_concurrent_calls ?? 1);
    const { count: liveCalls } = await admin
      .from("voice_call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", number.workspace_id)
      .in("status", ["ringing", "in_progress"])
      .neq("provider_call_id", callSid);
    if ((liveCalls ?? 0) >= maxConcurrent) {
      return await fallback("concurrency_limit", "Thanks for calling. We are on another call at the moment — please hold while we try to put you through.");
    }

    const token = sessionId
      ? await signGatewayToken({
        call_session_id: sessionId,
        workspace_id: number.workspace_id,
        assistant_id: assistant.id,
        config_version: assistant.published_version ?? null,
        tools: ["check_availability", "book_appointment", "request_callback", "transfer_call", "search_knowledge"],
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      })
      : null;

    const wsUrl = token ? gatewayWsUrl(token) : null;
    if (!wsUrl) {
      return await fallback("gateway_unavailable", "Thanks for calling. Our assistant is not available at the moment — please hold while we try to put you through.");
    }

    const config = (assistant.config ?? {}) as Record<string, unknown>;
    const announcement = settings.recording_enabled
      ? String(config.recordingAnnouncement || "This call is recorded for quality and training purposes.")
      : "";

    await logEvent("connected_to_gateway", { assistant_id: assistant.id, recording: settings.recording_enabled === true });
    if (sessionId) {
      await admin.from("voice_call_sessions").update({ status: "in_progress" }).eq("id", sessionId);
    }

    return twiml(
      `${announcement ? say(announcement) : ""}<Connect><Stream url="${escapeXml(wsUrl)}"/></Connect>`,
    );
  } catch (err) {
    console.error("[voice-inbound-call] error", err);
    return twiml(say("Sorry, we could not connect your call. Please try again shortly."));
  }
});
