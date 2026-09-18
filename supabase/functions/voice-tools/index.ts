// Server-side tools the receptionist may use during a live call.
//
// Nothing here trusts the model: every tool is permission-checked against the
// assistant's published settings, scoped to the call's workspace, and made
// idempotent so a repeated tool call never double-books or double-logs.
//
// Tools: check_availability, book_appointment, request_callback, transfer_call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";
import { normalizePhoneE164 } from "../_shared/phone.ts";
import { syncCallToCrm } from "../_shared/voiceCrm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const TOOLS = ["check_availability", "book_appointment", "request_callback", "transfer_call"] as const;
type ToolName = (typeof TOOLS)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Tool replies are read aloud, so every failure carries a sentence the assistant can say. */
function toolError(message: string, spoken: string, status = 200) {
  return json({ ok: false, error: message, say: spoken }, status);
}

function isUuid(v: unknown) {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

async function logEvent(
  admin: any,
  call: any,
  eventType: string,
  payload: Record<string, unknown>,
  externalEventId?: string | null,
) {
  await admin.from("voice_call_events").insert({
    workspace_id: call.workspace_id,
    call_session_id: call.id,
    event_type: eventType,
    external_event_id: externalEventId ?? null,
    payload,
  });
}

/** Returns a previously stored result for this idempotency key, if any. */
async function previousResult(admin: any, call: any, key: string | null) {
  if (!key) return null;
  const { data } = await admin
    .from("voice_call_events")
    .select("payload")
    .eq("call_session_id", call.id)
    .eq("external_event_id", key)
    .maybeSingle();
  return data?.payload?.result ?? null;
}

async function invokeFunction(name: string, body: unknown) {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const tool = String(body.tool || "") as ToolName;
    const callSessionId = String(body.call_session_id || "");
    const args = (body.args ?? {}) as Record<string, unknown>;
    const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).slice(0, 120) : null;

    if (!TOOLS.includes(tool)) return toolError("Unknown tool", "Sorry, I can't do that on this call.", 400);
    if (!isUuid(callSessionId)) return toolError("A valid call_session_id is required", "Sorry, something went wrong.", 400);

    const { data: call } = await admin
      .from("voice_call_sessions")
      .select("*")
      .eq("id", callSessionId)
      .maybeSingle();
    if (!call) return toolError("Call not found", "Sorry, something went wrong.", 404);

    const denied = await requireInternalOrWorkspaceMember(req, admin, call.workspace_id);
    if (denied) return denied;

    const { data: assistant } = await admin
      .from("voice_assistants")
      .select("id, name, config")
      .eq("id", call.assistant_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    const config = (assistant?.config ?? {}) as Record<string, any>;

    const cached = await previousResult(admin, call, idempotencyKey);
    if (cached) return json({ ok: true, repeated: true, ...cached });

    // ---------------------------------------------------------------- availability
    if (tool === "check_availability") {
      if (!config.bookingEnabled || !isUuid(config.bookingPageId)) {
        return toolError(
          "Booking is not enabled for this assistant",
          "I can't book appointments myself, but I can take your details and have someone call you back.",
        );
      }
      const date = typeof args.date === "string" ? args.date : new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return toolError("date must be YYYY-MM-DD", "Which day were you thinking of?");
      }
      const { ok, data } = await invokeFunction("booking-availability", {
        booking_page_id: config.bookingPageId,
        date,
      });
      if (!ok) {
        return toolError("Availability lookup failed", "I can't see the diary right now — may I take your number and have someone call you back?");
      }
      const slots: string[] = Array.isArray(data?.slots) ? data.slots.slice(0, 6) : [];
      await logEvent(admin, call, "tool.check_availability", { date, slot_count: slots.length });
      return json({
        ok: true,
        date,
        slots,
        say: slots.length
          ? "Here are the next available times."
          : "There's nothing free that day — shall I look at another day?",
      });
    }

    // ------------------------------------------------------------------- booking
    if (tool === "book_appointment") {
      if (!config.bookingEnabled || !isUuid(config.bookingPageId)) {
        return toolError("Booking is not enabled for this assistant", "I can't book that myself, but I'll arrange a call back.");
      }
      const startTime = typeof args.start_time === "string" ? args.start_time : "";
      const name = String(args.name || "").trim();
      const email = String(args.email || "").trim().toLowerCase();
      const phone = normalizePhoneE164(String(args.phone || "") || call.from_number);
      const notes = typeof args.notes === "string" ? args.notes.slice(0, 2000) : null;

      if (!startTime || Number.isNaN(Date.parse(startTime))) {
        return toolError("A valid start_time is required", "Which of those times would you like?");
      }
      if (new Date(startTime).getTime() < Date.now()) {
        return toolError("start_time is in the past", "That time has already passed — shall we find another?");
      }
      if (!name) return toolError("A name is required", "Can I take your full name for the booking?");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return toolError("A valid email is required", "Can I take an email address so I can send you the confirmation?");
      }

      const { ok, data } = await invokeFunction("book-appointment", {
        booking_page_id: config.bookingPageId,
        guest_name: name,
        guest_email: email,
        guest_phone: phone,
        start_time: startTime,
        notes: [notes, `Booked by phone with ${assistant?.name ?? "the receptionist"}.`].filter(Boolean).join("\n"),
        source: "voice_call",
      });
      if (!ok || !data?.booking?.id) {
        const reason = String(data?.error || "Booking failed");
        const spoken = /no longer available|already booked|taken/i.test(reason)
          ? "I'm sorry, that slot has just gone — shall I offer you another time?"
          : "I couldn't complete the booking just now — I'll have a colleague call you back to confirm.";
        await logEvent(admin, call, "tool.book_appointment.failed", { reason });
        return toolError(reason, spoken);
      }

      const bookingId = data.booking.id as string;
      await admin
        .from("voice_call_sessions")
        .update({ booking_id: bookingId, outcome: "booked" })
        .eq("id", call.id);
      if (call.contact_id) {
        await admin.from("bookings").update({ contact_id: call.contact_id }).eq("id", bookingId);
      }

      const result = { booking_id: bookingId, start_time: startTime };
      await logEvent(admin, call, "tool.book_appointment", { result, args: { startTime, email } }, idempotencyKey);
      return json({ ...result, ok: true, say: "That's booked — you'll get a confirmation shortly." });
    }

    // ----------------------------------------------------------------- callback
    if (tool === "request_callback") {
      const name = String(args.name || "").trim() || "Phone caller";
      const phone = normalizePhoneE164(String(args.phone || "") || call.from_number);
      const reason = typeof args.reason === "string" ? args.reason.slice(0, 2000) : null;
      const preferredTime = typeof args.preferred_time === "string" ? args.preferred_time.slice(0, 200) : null;
      if (!phone) {
        return toolError("A contactable number is required", "What's the best number to call you back on?");
      }

      // Make sure the caller exists in the CRM before the task points at them.
      let contactId: string | null = call.contact_id ?? null;
      if (!contactId) {
        const synced = await syncCallToCrm(admin, call.id).catch(() => null);
        contactId = synced?.contactId ?? null;
      }

      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: task } = await admin
        .from("crm_tasks")
        .insert({
          workspace_id: call.workspace_id,
          title: `Call back ${name}${phone ? ` on ${phone}` : ""}`,
          description: [reason, preferredTime && `Preferred time: ${preferredTime}`].filter(Boolean).join("\n") || null,
          status: "open",
          priority: "high",
          due_at: dueAt,
          contact_id: contactId,
          assigned_to: config.ownerUserId ?? null,
          source: "voice_call",
        })
        .select("id")
        .maybeSingle();

      const result = { task_id: task?.id ?? null, contact_id: contactId, phone };
      await admin.from("voice_call_sessions").update({ outcome: "callback_requested" }).eq("id", call.id);
      await logEvent(admin, call, "tool.request_callback", { result }, idempotencyKey);
      return json({ ...result, ok: true, say: "I've asked a colleague to call you back — they'll be in touch within one working day." });
    }

    // ----------------------------------------------------------------- transfer
    if (tool === "transfer_call") {
      const number = normalizePhoneE164(String(config.transferNumber || ""));
      if (!config.transferEnabled || !number) {
        return toolError(
          "Transfer is not enabled for this assistant",
          "I can't put you through right now, but I can take your details and have someone call you back.",
        );
      }
      const reason = typeof args.reason === "string" ? args.reason.slice(0, 500) : null;
      const result = { transfer_to: number };
      await admin.from("voice_call_sessions").update({ outcome: "transferred" }).eq("id", call.id);
      await logEvent(admin, call, "tool.transfer_call", { result, reason }, idempotencyKey);
      return json({ ...result, ok: true, say: "Let me put you through now — one moment." });
    }

    return toolError("Unknown tool", "Sorry, I can't do that on this call.", 400);
  } catch (err) {
    console.error("[voice-tools] failed", String(err));
    return toolError(
      err instanceof Error ? err.message : "Unexpected error",
      "Sorry, something went wrong — I'll have a colleague call you back.",
      500,
    );
  }
});
