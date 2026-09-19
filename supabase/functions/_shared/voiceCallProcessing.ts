/**
 * Post-call processing for NexusFlo Voice.
 *
 * Runs once per call (replay-safe): writes a summary, intent, sentiment,
 * outcome and the details captured during the call, pulls any recording into
 * private storage, then syncs the caller into the CRM.
 *
 * Nothing here invents facts: every field comes from the call transcript, and
 * a call with no transcript is marked as having nothing to summarise.
 */
import { syncCallToCrm } from "./voiceCrm.ts";

const OUTCOMES = [
  "booked",
  "transferred",
  "callback_requested",
  "enquiry",
  "information_given",
  "no_answer",
  "spam",
  "other",
] as const;

const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export type ProcessResult = {
  ok: boolean;
  status: string;
  summary?: string | null;
  crm?: unknown;
};

function clampChoice(value: unknown, allowed: readonly string[], fallback: string) {
  const v = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(v) ? v : fallback;
}

/** Downloads the provider recording into the private bucket, once. */
async function ingestRecording(
  admin: any,
  call: { id: string; workspace_id: string; provider_call_id: string | null },
) {
  const { data: existing } = await admin
    .from("voice_call_recordings")
    .select("id")
    .eq("call_session_id", call.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return;

  const { data: settings } = await admin
    .from("voice_settings")
    .select("recording_enabled, recording_retention_days")
    .eq("workspace_id", call.workspace_id)
    .maybeSingle();
  if (!settings?.recording_enabled) return;
  if (!call.provider_call_id) return;

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!accountSid || !authToken) return;

  const auth = "Basic " + btoa(`${accountSid}:${authToken}`);
  const listUrl =
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.provider_call_id}/Recordings.json`;
  const listRes = await fetch(listUrl, { headers: { Authorization: auth } });
  if (!listRes.ok) {
    console.error("[voice-process] recording list failed", listRes.status);
    return;
  }
  const list = await listRes.json().catch(() => ({}));
  const rec = (list.recordings ?? [])[0];
  if (!rec?.sid) return;

  const mediaUrl =
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${rec.sid}.mp3`;
  const audio = await fetch(mediaUrl, { headers: { Authorization: auth } });
  if (!audio.ok) return;
  const bytes = new Uint8Array(await audio.arrayBuffer());

  const path = `${call.workspace_id}/${call.id}/${rec.sid}.mp3`;
  const up = await admin.storage
    .from("voice-recordings")
    .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
  if (up.error) {
    console.error("[voice-process] recording upload failed", up.error.message);
    return;
  }

  const retentionDays = Number(settings.recording_retention_days ?? 90);
  await admin.from("voice_call_recordings").insert({
    workspace_id: call.workspace_id,
    call_session_id: call.id,
    storage_path: path,
    provider_recording_id: rec.sid,
    duration_seconds: Number(rec.duration ?? 0) || 0,
    size_bytes: bytes.byteLength,
    mime_type: "audio/mpeg",
    consent_captured: true,
    retention_expires_at: new Date(Date.now() + retentionDays * 86400000).toISOString(),
  });
}

async function summariseWithAi(
  transcript: string,
  intakeQuestions: string[],
): Promise<Record<string, unknown> | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const wanted = intakeQuestions.length
    ? `The receptionist was asked to capture these details: ${intakeQuestions.join("; ")}. ` +
      `Put anything the caller actually gave into "details" using short snake_case keys. Omit anything not said.`
    : `Put any concrete details the caller gave (name, email, address, service, timing) into "details" using short snake_case keys.`;

  const system =
    `You summarise telephone calls answered by an AI receptionist for a UK business. ` +
    `Use only what is in the transcript — never guess or invent. Write in plain British English. ` +
    `${wanted} Respond with ONLY JSON of the shape ` +
    `{"summary": string, "intent": string, "sentiment": "positive"|"neutral"|"negative", ` +
    `"outcome": "booked"|"transferred"|"callback_requested"|"enquiry"|"information_given"|"no_answer"|"spam"|"other", ` +
    `"follow_up": string, "details": object}. ` +
    `"summary" is 1-3 sentences. "intent" is a short phrase such as "new enquiry" or "existing booking".`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Call transcript:\n\n${transcript}` },
      ],
    }),
  });

  if (!res.ok) {
    console.error("[voice-process] ai gateway error", res.status, await res.text());
    return null;
  }
  const data = await res.json().catch(() => null);
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Processes a finished call. Safe to call repeatedly: it only re-runs when
 * `force` is set, otherwise a call already processed is left untouched.
 */
export async function processCall(
  admin: any,
  callSessionId: string,
  opts: { force?: boolean } = {},
): Promise<ProcessResult> {
  const { data: call } = await admin
    .from("voice_call_sessions")
    .select(
      "id, workspace_id, assistant_id, provider_call_id, status, summary, duration_seconds, extracted_fields",
    )
    .eq("id", callSessionId)
    .maybeSingle();
  if (!call) return { ok: false, status: "call_not_found" };

  const processedKey = `processed:${call.id}`;
  if (!opts.force) {
    const { data: done } = await admin
      .from("voice_call_events")
      .select("id")
      .eq("call_session_id", call.id)
      .eq("external_event_id", processedKey)
      .maybeSingle();
    if (done) return { ok: true, status: "already_processed", summary: call.summary };
  }

  try {
    await ingestRecording(admin, call);
  } catch (err) {
    console.error("[voice-process] recording ingest failed", err);
  }

  const { data: turns } = await admin
    .from("voice_call_transcripts")
    .select("speaker, content, turn_index")
    .eq("call_session_id", call.id)
    .order("turn_index", { ascending: true })
    .limit(400);

  const lines = (turns ?? [])
    .map((t: any) => `${t.speaker === "caller" ? "Caller" : "Receptionist"}: ${t.content}`)
    .filter((l: string) => l.trim().length > 0);

  let updates: Record<string, unknown> = {};
  let status = "processed";

  if (lines.length === 0) {
    status = "no_transcript";
    if (!call.summary) {
      updates.summary = "No conversation was recorded for this call.";
      updates.outcome = call.duration_seconds > 0 ? "other" : "no_answer";
    }
  } else {
    let intake: string[] = [];
    if (call.assistant_id) {
      const { data: assistant } = await admin
        .from("voice_assistants")
        .select("config")
        .eq("id", call.assistant_id)
        .maybeSingle();
      const q = (assistant?.config as any)?.intakeQuestions;
      if (Array.isArray(q)) intake = q.map((x: unknown) => String(x)).filter(Boolean);
    }

    const transcript = lines.join("\n").slice(0, 16000);
    const ai = await summariseWithAi(transcript, intake);

    if (ai) {
      const details =
        ai.details && typeof ai.details === "object" && !Array.isArray(ai.details)
          ? (ai.details as Record<string, unknown>)
          : {};
      updates = {
        summary: String(ai.summary ?? "").slice(0, 2000) || null,
        intent: String(ai.intent ?? "").slice(0, 120) || null,
        sentiment: clampChoice(ai.sentiment, SENTIMENTS, "neutral"),
        outcome: clampChoice(ai.outcome, OUTCOMES, "enquiry"),
        extracted_fields: {
          ...(call.extracted_fields ?? {}),
          ...details,
          ...(ai.follow_up ? { follow_up: String(ai.follow_up).slice(0, 500) } : {}),
        },
      };
    } else {
      status = "summary_unavailable";
      if (!call.summary) {
        updates.summary = lines.slice(0, 6).join(" ").slice(0, 600);
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("voice_call_sessions").update(updates).eq("id", call.id);
  }

  await admin
    .from("voice_call_events")
    .upsert(
      {
        workspace_id: call.workspace_id,
        call_session_id: call.id,
        event_type: "post_call_processed",
        external_event_id: processedKey,
        payload: { status, turns: lines.length },
      },
      { onConflict: "call_session_id,external_event_id" },
    );

  let crm: unknown = null;
  try {
    crm = await syncCallToCrm(admin, call.id);
  } catch (err) {
    console.error("[voice-process] crm sync failed", err);
  }

  return { ok: true, status, summary: (updates.summary as string) ?? call.summary, crm };
}
