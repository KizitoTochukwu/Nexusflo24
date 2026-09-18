/**
 * Turns a phone call into CRM records: one canonical contact, a timeline entry,
 * optional opportunity, owner, tags and score — using the same helpers as every
 * other acquisition path so a caller never becomes a second contact.
 *
 * Every step is idempotent: re-running for the same call updates rather than
 * duplicates, so replayed provider webhooks are safe.
 */

import { normalizePhoneE164 } from "./phone.ts";
import { upsertCanonicalContact, recordContactTimeline } from "./canonicalContact.ts";
import { ensureWorkspaceTag } from "./crmTagSync.ts";

type Client = any;

export interface VoiceCallCrmResult {
  contactId: string | null;
  dealId: string | null;
  created: boolean;
  reason?: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  booked: "Appointment booked",
  transferred: "Transferred to a person",
  callback_requested: "Callback requested",
  enquiry: "Enquiry captured",
  no_answer: "No answer",
  voicemail: "Voicemail",
  spam: "Marked as spam",
  abandoned: "Caller hung up",
};

function secondsToClock(total: number): string {
  const s = Math.max(0, Math.round(total || 0));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function titleCaseField(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Builds the human-readable call note shown on the contact timeline. */
export function buildCallSummary(call: any, assistantName?: string | null): string {
  const fields = (call.extracted_fields ?? {}) as Record<string, unknown>;
  const lines: string[] = [];
  if (call.summary) lines.push(String(call.summary));
  const detail = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${titleCaseField(k)}: ${String(v)}`);
  if (detail.length) lines.push(detail.join("\n"));
  const meta: string[] = [];
  if (assistantName) meta.push(`Answered by ${assistantName}`);
  if (call.duration_seconds) meta.push(`Duration ${secondsToClock(call.duration_seconds)}`);
  if (call.outcome) meta.push(OUTCOME_LABEL[call.outcome] ?? String(call.outcome));
  if (meta.length) lines.push(meta.join(" · "));
  return lines.join("\n\n").trim();
}

function callerName(call: any): string | null {
  const fields = (call.extracted_fields ?? {}) as Record<string, unknown>;
  for (const key of ["full_name", "name", "caller_name", "contact_name"]) {
    const value = fields[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return null;
}

function callerEmail(call: any): string | null {
  const fields = (call.extracted_fields ?? {}) as Record<string, unknown>;
  for (const key of ["email", "email_address", "caller_email"]) {
    const value = fields[key];
    const raw = value ? String(value).trim().toLowerCase() : "";
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) return raw;
  }
  return null;
}

/** The caller's number for an inbound call, or the number we dialled outbound. */
export function callerPhone(call: any): string | null {
  const raw = call.direction === "outbound" ? call.to_number : call.from_number;
  const normalized = normalizePhoneE164(raw);
  if (normalized) return normalized;
  const fields = (call.extracted_fields ?? {}) as Record<string, unknown>;
  return normalizePhoneE164(fields.phone ? String(fields.phone) : null);
}

/** Withheld / anonymous caller IDs must never create an empty contact. */
export function isAnonymousCaller(call: any): boolean {
  const raw = String(call.direction === "outbound" ? call.to_number : call.from_number || "").toLowerCase();
  if (!raw) return true;
  return ["anonymous", "unknown", "private", "withheld", "restricted", "+266696687"].some((m) => raw.includes(m));
}

async function applyContactUpdates(
  supabase: Client,
  contactId: string,
  crm: any,
  call: any,
): Promise<void> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, tags, owner_user_id, score, full_name, email")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return;

  const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };

  const wanted: string[] = Array.isArray(crm?.tags) ? crm.tags.filter(Boolean).map(String) : [];
  if (wanted.length) {
    const existing: string[] = Array.isArray(contact.tags) ? contact.tags : [];
    const lower = new Set(existing.map((t) => t.toLowerCase()));
    const merged = [...existing];
    for (const tag of wanted) {
      if (!lower.has(tag.toLowerCase())) {
        merged.push(tag);
        lower.add(tag.toLowerCase());
      }
      await ensureWorkspaceTag(supabase, call.workspace_id, tag);
    }
    if (merged.length !== existing.length) patch.tags = merged;
  }

  if (crm?.ownerUserId && !contact.owner_user_id) patch.owner_user_id = crm.ownerUserId;

  const name = callerName(call);
  if (name && !contact.full_name) patch.full_name = name;
  const email = callerEmail(call);
  if (email && !contact.email) patch.email = email;

  const bump = Number(crm?.scoreOnCall ?? 10);
  if (Number.isFinite(bump) && bump > 0) {
    patch.score = Math.max(0, Number(contact.score ?? 0) + bump);
    patch.score_updated_at = new Date().toISOString();
  }

  await supabase.from("contacts").update(patch).eq("id", contactId);
}

async function ensureDeal(
  supabase: Client,
  call: any,
  crm: any,
  contactId: string,
  assistantName: string | null,
): Promise<string | null> {
  if (!crm?.createDeal) return null;

  let pipelineId: string | null = crm.pipelineId ?? null;
  if (!pipelineId) {
    const { data: pipe } = await supabase
      .from("crm_pipelines")
      .select("id")
      .eq("workspace_id", call.workspace_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    pipelineId = pipe?.id ?? null;
  }
  if (!pipelineId) return null;

  // One open opportunity per caller per pipeline — a second call joins the first.
  const { data: open } = await supabase
    .from("crm_deals")
    .select("id")
    .eq("workspace_id", call.workspace_id)
    .eq("pipeline_id", pipelineId)
    .eq("contact_id", contactId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open?.id) return open.id;

  let stageId: string | null = crm.stageId ?? null;
  if (!stageId) {
    const { data: stage } = await supabase
      .from("crm_pipile_placeholder" in crm ? "crm_pipeline_stages" : "crm_pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    stageId = stage?.id ?? null;
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("full_name, phone")
    .eq("id", contactId)
    .maybeSingle();
  const who = contact?.full_name || callerName(call) || contact?.phone || "Phone caller";

  const { data: deal, error } = await supabase
    .from("crm_deals")
    .insert({
      workspace_id: call.workspace_id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      name: `${who} – Phone enquiry`,
      status: "open",
      contact_id: contactId,
      owner_user_id: crm.ownerUserId ?? null,
      source: assistantName ? `Phone call (${assistantName})` : "Phone call",
      description: buildCallSummary(call, assistantName) || null,
      tags: Array.isArray(crm?.tags) ? crm.tags.filter(Boolean).map(String) : [],
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[voice-crm] deal insert failed", error.message);
    return null;
  }
  return deal?.id ?? null;
}

/**
 * Syncs one call session into the CRM. Safe to call repeatedly for the same
 * call — the timeline entry is keyed on the call id.
 */
export async function syncCallToCrm(
  supabase: Client,
  callSessionId: string,
): Promise<VoiceCallCrmResult> {
  const { data: call, error } = await supabase
    .from("voice_call_sessions")
    .select("*")
    .eq("id", callSessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!call) return { contactId: null, dealId: null, created: false, reason: "call_not_found" };

  let assistantName: string | null = null;
  let crm: any = {};
  if (call.assistant_id) {
    const { data: assistant } = await supabase
      .from("voice_assistants")
      .select("name, config")
      .eq("id", call.assistant_id)
      .maybeSingle();
    assistantName = assistant?.name ?? null;
    const config = (assistant?.config ?? {}) as Record<string, unknown>;
    crm = {
      pipelineId: config.pipelineId ?? null,
      stageId: config.stageId ?? null,
      ownerUserId: config.ownerUserId ?? null,
      tags: Array.isArray(config.tags) ? config.tags : [],
      createDeal: config.createDeal !== false,
      scoreOnCall: config.scoreOnCall ?? 10,
    };
  }

  if (call.outcome === "spam") {
    return { contactId: null, dealId: null, created: false, reason: "marked_spam" };
  }

  const phone = callerPhone(call);
  const email = callerEmail(call);
  if (!phone && !email) {
    return {
      contactId: null,
      dealId: null,
      created: false,
      reason: isAnonymousCaller(call) ? "number_withheld" : "no_identifier",
    };
  }

  let contactId: string | null = call.contact_id ?? null;
  if (!contactId) {
    contactId = await upsertCanonicalContact(
      supabase,
      {
        workspaceId: call.workspace_id,
        email,
        phone,
        fullName: callerName(call),
        source: assistantName ? `Phone call (${assistantName})` : "Phone call",
        attribution: { channel: "voice", provider: call.provider, direction: call.direction },
        sourceTable: "voice_call_sessions",
        sourceRecordId: call.id,
      },
      call.id,
    );
  }
  if (!contactId) return { contactId: null, dealId: null, created: false, reason: "contact_failed" };

  await applyContactUpdates(supabase, contactId, crm, call);
  const dealId = call.deal_id ?? (await ensureDeal(supabase, call, crm, contactId, assistantName));

  await recordContactTimeline(supabase, {
    workspaceId: call.workspace_id,
    contactId,
    activityType: "call",
    title:
      call.direction === "outbound"
        ? `Outbound call${assistantName ? ` by ${assistantName}` : ""}`
        : `Inbound call${assistantName ? ` answered by ${assistantName}` : ""}`,
    description: buildCallSummary(call, assistantName) || "No summary was captured for this call.",
    source: "voice",
    externalEventId: `voice-call:${call.id}`,
    meta: {
      call_session_id: call.id,
      provider: call.provider,
      provider_call_id: call.provider_call_id,
      duration_seconds: call.duration_seconds,
      outcome: call.outcome,
      intent: call.intent,
      sentiment: call.sentiment,
      from_number: call.from_number,
      to_number: call.to_number,
    },
  });

  const patch: Record<string, unknown> = { contact_id: contactId };
  if (dealId && !call.deal_id) patch.deal_id = dealId;
  await supabase.from("voice_call_sessions").update(patch).eq("id", call.id);

  return { contactId, dealId: dealId ?? null, created: !call.contact_id };
}
