import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeString, isValidEmail, isValidPhone, sanitizeTags, safeErrorResponse } from "../_shared/validation.ts";
import { normalizePhoneE164 } from "../_shared/phone.ts";
import { upsertCanonicalContact, linkLeadToContact, recordContactTimeline } from "../_shared/canonicalContact.ts";
import { isAfarhomeEnquiry, processAfarhomeEnquiry } from "../_shared/afarhomeIntake.ts";
import { dispatchTriggerEvent } from "../_shared/triggerDispatch.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-workspace-id, x-crm-webhook-secret",
};

// Constant-time string comparison (avoids leaking secret via timing)
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// Keep lead status wording consistent so CRM filters and counts agree.
const STATUS_CANONICAL: Record<string, string> = {
  "new": "New",
  "new lead": "New",
  "lead": "New",
  "warm": "Warm",
  "hot": "Hot",
  "won": "Won",
  "customer": "Won",
  "lost": "Lost",
  "unqualified": "Lost",
};

function normaliseStatus(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "New";
  return STATUS_CANONICAL[raw.toLowerCase()] ?? raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: either the legacy ingest bearer token, or the shared CRM webhook secret.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const providedSecret = req.headers.get("x-crm-webhook-secret") ?? "";

  const expectedToken = Deno.env.get("LEADS_INGEST_TOKEN") ?? "";
  const webhookSecret = Deno.env.get("CRM_WEBHOOK_SECRET") ?? "";

  const authorized =
    (!!expectedToken && !!bearer && timingSafeEqual(bearer, expectedToken)) ||
    (!!webhookSecret && !!providedSecret && timingSafeEqual(providedSecret, webhookSecret)) ||
    (!!webhookSecret && !!bearer && timingSafeEqual(bearer, webhookSecret));

  if (!authorized) {
    console.warn("[ingest-leads] rejected unauthenticated webhook call");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Validate and sanitize inputs
    const full_name = sanitizeString(body.full_name, 100);
    const email = sanitizeString(body.email, 255);
    const rawPhone = sanitizeString(body.phone, 30);
    const phone = rawPhone ? normalizePhoneE164(rawPhone) : null;
    const source = sanitizeString(body.source, 100);
    const status = sanitizeString(body.status, 50);
    const notes = sanitizeString(body.notes, 1000);
    const tags = sanitizeTags(body.tags);
    const score = typeof body.score === "number" ? Math.max(0, Math.min(100, Math.round(body.score))) : undefined;
    const meta = typeof body.meta === "object" && body.meta !== null ? body.meta : undefined;
    const utm = typeof body.utm === "object" && body.utm !== null ? body.utm : undefined;
    const event = typeof body.event === "object" && body.event !== null ? body.event : undefined;

    const trimmedEmail = email?.toLowerCase() || "";
    const trimmedPhone = phone || "";

    if (!trimmedEmail && !trimmedPhone) {
      return new Response(JSON.stringify({ error: "At least email or phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rawPhone && !trimmedPhone) {
      return new Response(JSON.stringify({ error: "Invalid phone format. Use international format like +447517327597." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fallbackOwnerId = Deno.env.get("OWNER_USER_ID") ?? null;

    // Workspace resolution: header first, then body workspace_id, then the
    // configured owner's first workspace.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const headerWs = req.headers.get("X-Workspace-Id");
    const bodyWs = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
    let workspaceId: string | null = (headerWs || bodyWs || "").trim() || null;

    if (workspaceId && !uuidRe.test(workspaceId)) {
      return new Response(
        JSON.stringify({ error: "invalid_workspace_id", message: "workspace_id must be a UUID." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (workspaceId) {
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .select("id, owner_user_id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (wsErr) throw wsErr;
      if (!ws) {
        return new Response(
          JSON.stringify({
            error: "unknown_workspace",
            message: `No workspace found with id ${workspaceId}.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      if (!fallbackOwnerId) {
        return new Response(
          JSON.stringify({
            error: "workspace_required",
            message:
              "No workspace was supplied. Send X-Workspace-Id header or workspace_id in the body.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.warn("[ingest-leads] No workspace supplied, falling back to owner's first workspace");
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", fallbackOwnerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!membership) {
        return new Response(
          JSON.stringify({
            error: "workspace_required",
            message:
              "No workspace was supplied and the configured owner has no workspace. Send X-Workspace-Id or workspace_id.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      workspaceId = membership.workspace_id;
    }

    // Resolve the user the lead is written as: prefer an actual member of the
    // target workspace (owner first), fall back to the configured owner secret.
    let ownerId: string | null = null;
    {
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      const list = members ?? [];
      ownerId =
        list.find((m: any) => m.role === "owner")?.user_id ??
        list.find((m: any) => m.role === "admin")?.user_id ??
        list[0]?.user_id ??
        fallbackOwnerId;
    }

    if (!ownerId) {
      return new Response(
        JSON.stringify({
          error: "owner_unresolved",
          message: "Could not resolve a user to attribute this lead to for the target workspace.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date().toISOString();

    // Try to find existing lead by email or phone within workspace
    let existing: { id: string; tags: string[] | null } | null = null;

    if (trimmedEmail) {
      const { data } = await supabase
        .from("leads")
        .select("id, tags")
        .eq("workspace_id", workspaceId)
        .ilike("email", trimmedEmail)
        .maybeSingle();
      existing = data;
    }

    if (!existing && trimmedPhone) {
      const { data } = await supabase
        .from("leads")
        .select("id, tags")
        .eq("workspace_id", workspaceId)
        .eq("phone", trimmedPhone)
        .maybeSingle();
      existing = data;
    }

    let leadId: string;
    let action: string;

    if (existing) {
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...tags]));
      const updates: Record<string, unknown> = {
        updated_at: now,
        last_activity_at: now,
        tags: mergedTags,
      };
      if (full_name) updates.full_name = full_name;
      if (trimmedPhone) updates.phone = trimmedPhone;
      if (source) updates.source = source;
      if (status) updates.status = status;
      if (score !== undefined) updates.score = score;
      if (notes) updates.notes = notes;

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", existing.id);
      if (error) throw error;

      leadId = existing.id;
      action = "updated";
    } else {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          user_id: ownerId,
          workspace_id: workspaceId,
          full_name: full_name || null,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          source: source || "Make.com",
          status: normaliseStatus(status),
          score: score ?? 10,
          tags: tags.length ? tags : ["make-ingest"],
          notes: notes || null,
          last_activity_at: now,
        })
        .select("id")
        .single();
      if (error) throw error;

      leadId = newLead.id;
      action = "created";
    }

    // Canonical CRM contact
    let canonicalContactId: string | null = null;
    try {
      canonicalContactId = await upsertCanonicalContact(supabase, {
        workspaceId: workspaceId!,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        fullName: full_name || null,
        source: source || "Make.com",
        attribution: { source: source || "Make.com", ...(utm ?? {}) },
        sourceTable: "leads",
        sourceRecordId: leadId,
      });
      if (canonicalContactId) {
        await linkLeadToContact(supabase, leadId, canonicalContactId);
        await recordContactTimeline(supabase, {
          workspaceId: workspaceId!,
          contactId: canonicalContactId,
          activityType: "lead_captured",
          title: "Lead ingested",
          description: source || "Make.com",
          source: source || "Make.com",
          externalEventId: `lead:${leadId}`,
          meta: { lead_id: leadId },
        });
      }
    } catch (contactErr) {
      console.error("[ingest-leads] canonical contact failed:", String(contactErr));
    }

    // --- AfarHome enquiry intake (custom fields, dynamic tags, opportunity) ---
    if (isAfarhomeEnquiry(tags, body.afarhome)) {
      const fieldsObj = (typeof body.fields === "object" && body.fields !== null ? body.fields : {}) as Record<string, unknown>;
      const pick = (k: string) => sanitizeString(fieldsObj[k] ?? (meta as any)?.[k], 2000);
      await processAfarhomeEnquiry(supabase, {
        workspaceId: workspaceId!,
        leadId,
        contactId: canonicalContactId,
        ownerId,
        fullName: full_name || null,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        fields: {
          country_of_residence: pick("country_of_residence"),
          service_interest: pick("service_interest"),
          service_location: pick("service_location"),
          service_urgency: pick("service_urgency"),
          enquiry_details: pick("enquiry_details") || notes,
          preferred_channel: pick("preferred_channel"),
          enquiry_date: pick("enquiry_date") || now.slice(0, 10),
          marketing_consent: fieldsObj["marketing_consent"] === true || fieldsObj["marketing_consent"] === "true",
        },
      });
    }

    // --- Fire workflow triggers (mirrors capture-lead) ---
    try {
      const previousTags = (existing?.tags || []) as string[];
      const addedTags = tags.filter(
        (t: string) => !previousTags.some((p) => String(p).toLowerCase() === String(t).toLowerCase()),
      );
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const dispatchWorkflow = async (eventType: string, eventConfig: Record<string, unknown>) => {
        const response = await fetch(`${supabaseUrl}/functions/v1/enroll-workflow-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
          body: JSON.stringify({
            workspace_id: workspaceId,
            lead_ids: [leadId],
            event_type: eventType,
            event_config: eventConfig,
          }),
        });
        if (!response.ok) {
          console.error(`[ingest-leads] workflow trigger ${eventType} failed with status ${response.status}`);
        }
      };
      if (addedTags.length > 0) {
        for (const tag of addedTags) {
          await dispatchWorkflow("lead_tagged", { tag });
        }
      }
      if (!existing) await dispatchWorkflow("new_lead", {});

      // A submission is an event even when it updates an existing lead and
      // contributes no new tags. This enables intentional workflow re-entry.
      await dispatchWorkflow("form_submitted", {
        form_id: typeof body.form_id === "string" ? body.form_id : null,
        source: source || "Make.com",
      });
    } catch (trigErr) {
      console.error("[ingest-leads] trigger dispatch failed:", String(trigErr));
    }

    // Log activity
    const activityMeta: Record<string, unknown> = {};
    if (meta) activityMeta.meta = meta;
    if (utm) activityMeta.utm = utm;
    if (event) activityMeta.event = event;
    if (source) activityMeta.source = source;

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: ownerId,
      workspace_id: workspaceId,
      type: (event as any)?.type || "opt_in",
      meta: activityMeta,
      ...((event as any)?.timestamp ? { created_at: (event as any).timestamp } : {}),
    });


    return new Response(
      JSON.stringify({ ok: true, action, lead_id: leadId, workspace_id: workspaceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const anyErr = err as any;
    if (anyErr?.code === "23505") {
      const msg = String(anyErr?.message || "");
      const isPhone = /phone/i.test(msg);
      return new Response(
        JSON.stringify({
          error: isPhone ? "duplicate_phone" : "duplicate_email",
          message: isPhone
            ? "A lead with this phone number already exists."
            : "A lead with this email already exists.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: safeErrorResponse(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
