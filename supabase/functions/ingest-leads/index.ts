import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeString, isValidEmail, isValidPhone, sanitizeTags, safeErrorResponse } from "../_shared/validation.ts";
import { normalizePhoneE164 } from "../_shared/phone.ts";
import { upsertCanonicalContact, linkLeadToContact, recordContactTimeline } from "../_shared/canonicalContact.ts";


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

    const ownerId = Deno.env.get("OWNER_USER_ID");
    if (!ownerId) {
      return new Response(JSON.stringify({ error: "Owner not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Workspace-aware: prefer X-Workspace-Id header, fallback to owner's first workspace
    let workspaceId = req.headers.get("X-Workspace-Id");

    if (workspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (!ws) {
        return new Response(JSON.stringify({ error: "Invalid workspace_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[ingest-leads] No X-Workspace-Id header provided, falling back to owner's first workspace");
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "No workspace found for owner" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      workspaceId = membership.workspace_id;
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
          status: status || "New",
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
    try {
      const contactId = await upsertCanonicalContact(supabase, {
        workspaceId: workspaceId!,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        fullName: full_name || null,
        source: source || "Make.com",
        attribution: { source: source || "Make.com", ...(utm ?? {}) },
        sourceTable: "leads",
        sourceRecordId: leadId,
      });
      if (contactId) {
        await linkLeadToContact(supabase, leadId, contactId);
        await recordContactTimeline(supabase, {
          workspaceId: workspaceId!,
          contactId,
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
