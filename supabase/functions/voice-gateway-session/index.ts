/**
 * Platform API for the NexusFlo Voice gateway (Cloud Run).
 *
 * The gateway holds no database credentials. It presents the short-lived,
 * per-call token minted by voice-inbound-call and may only touch that one
 * call. Actions:
 *   start      — the assistant's published instructions, voice and permissions
 *   knowledge  — answer lookup, plus an unanswered-question record on a miss
 *   transcript — append conversation turns
 *   event      — record a call event
 *   end        — close the call out with a summary, outcome and captured fields
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireGatewayToken } from "../_shared/voice-gateway-token.ts";
import { syncCallToCrm } from "../_shared/voiceCrm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await requireGatewayToken(req);
  if (!claims) return json({ error: "Invalid or expired call token" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    const { data: call } = await admin
      .from("voice_call_sessions")
      .select("id, workspace_id, assistant_id, from_number, to_number, status")
      .eq("id", claims.call_session_id)
      .maybeSingle();
    if (!call || call.workspace_id !== claims.workspace_id) return json({ error: "Call not found" }, 404);

    if (action === "start") {
      const { data: assistant } = await admin
        .from("voice_assistants")
        .select("id, name, config, runtime_prompt, published_version, status")
        .eq("id", call.assistant_id ?? "00000000-0000-0000-0000-000000000000")
        .maybeSingle();
      if (!assistant || assistant.status !== "active") return json({ error: "Assistant is not live" }, 409);

      const { data: settings } = await admin
        .from("voice_settings")
        .select("recording_enabled, transfer_number")
        .eq("workspace_id", call.workspace_id)
        .maybeSingle();

      const config = (assistant.config ?? {}) as Record<string, unknown>;
      return json({
        ok: true,
        call: { id: call.id, from: call.from_number, to: call.to_number },
        assistant: {
          id: assistant.id,
          name: assistant.name,
          instructions: assistant.runtime_prompt,
          voice: config.voiceId ?? "alloy",
          language: config.language ?? "en-GB",
          greeting: config.greeting ?? null,
          version: assistant.published_version ?? null,
        },
        permissions: {
          tools: claims.tools,
          booking: config.bookingEnabled === true,
          transfer: config.transferEnabled === true,
          transfer_number: config.transferNumber ?? settings?.transfer_number ?? null,
          recording: settings?.recording_enabled === true,
        },
      });
    }

    if (action === "knowledge") {
      const query = String(body.query || "").trim();
      if (!query) return json({ ok: true, results: [] });
      const { data: results } = await admin.rpc("voice_search_knowledge", {
        _workspace_id: call.workspace_id,
        _query: query,
        _assistant_id: call.assistant_id,
        _limit: 5,
      });
      if (!results || results.length === 0) {
        await admin.from("voice_unanswered_questions").insert({
          workspace_id: call.workspace_id,
          assistant_id: call.assistant_id,
          call_session_id: call.id,
          question: query.slice(0, 500),
        });
        return json({
          ok: true,
          results: [],
          say: "I don't have that to hand, but I can arrange for a colleague to call you back with the answer.",
        });
      }
      return json({ ok: true, results });
    }

    if (action === "transcript") {
      const turns = Array.isArray(body.turns) ? body.turns : [];
      if (turns.length === 0) return json({ ok: true, saved: 0 });
      const rows = turns
        .filter((t: any) => t && typeof t.content === "string" && t.content.trim())
        .map((t: any, i: number) => ({
          workspace_id: call.workspace_id,
          call_session_id: call.id,
          turn_index: Number.isFinite(t.turn_index) ? Number(t.turn_index) : i,
          speaker: ["caller", "assistant", "system", "agent"].includes(t.speaker) ? t.speaker : "system",
          content: String(t.content).slice(0, 8000),
          started_offset_ms: Number.isFinite(t.offset_ms) ? Number(t.offset_ms) : null,
        }));
      const { error } = await admin
        .from("voice_call_transcripts")
        .upsert(rows, { onConflict: "call_session_id,turn_index" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, saved: rows.length });
    }

    if (action === "event") {
      const type = String(body.event_type || "gateway_event").slice(0, 60);
      await admin.from("voice_call_events").insert({
        workspace_id: call.workspace_id,
        call_session_id: call.id,
        event_type: type,
        external_event_id: body.external_event_id ? String(body.external_event_id).slice(0, 200) : null,
        payload: body.payload ?? {},
      });
      return json({ ok: true });
    }

    if (action === "end") {
      const outcome = typeof body.outcome === "string" ? body.outcome : null;
      await admin
        .from("voice_call_sessions")
        .update({
          summary: typeof body.summary === "string" ? body.summary.slice(0, 4000) : undefined,
          transcript_summary: typeof body.summary === "string" ? body.summary.slice(0, 4000) : undefined,
          extracted_fields: body.extracted_fields ?? undefined,
          intent: typeof body.intent === "string" ? body.intent.slice(0, 120) : undefined,
          sentiment: typeof body.sentiment === "string" ? body.sentiment.slice(0, 40) : undefined,
          ...(outcome ? { outcome } : {}),
        })
        .eq("id", call.id);

      try {
        await syncCallToCrm(admin, call.id);
      } catch (err) {
        console.error("[voice-gateway-session] crm sync failed", err);
      }
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("[voice-gateway-session] error", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
