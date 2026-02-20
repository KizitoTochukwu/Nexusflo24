import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // Bearer token auth
  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("LEADS_INGEST_TOKEN");
  if (!expectedToken || !authHeader || authHeader !== `Bearer ${expectedToken}`) {
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
    const {
      full_name, email, phone, source, status, score, tags,
      notes, meta, utm, event,
    } = body;

    const ownerId = Deno.env.get("OWNER_USER_ID");
    if (!ownerId) {
      return new Response(JSON.stringify({ error: "OWNER_USER_ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email?.trim().toLowerCase() || "";
    const trimmedPhone = phone?.trim() || "";

    if (!trimmedEmail && !trimmedPhone) {
      return new Response(JSON.stringify({ error: "At least email or phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const newTags: string[] = tags || [];

    // Try to find existing lead by email or phone
    let existing: { id: string; tags: string[] | null } | null = null;

    if (trimmedEmail) {
      const { data } = await supabase
        .from("leads")
        .select("id, tags")
        .eq("user_id", ownerId)
        .ilike("email", trimmedEmail)
        .maybeSingle();
      existing = data;
    }

    if (!existing && trimmedPhone) {
      const { data } = await supabase
        .from("leads")
        .select("id, tags")
        .eq("user_id", ownerId)
        .eq("phone", trimmedPhone)
        .maybeSingle();
      existing = data;
    }

    let leadId: string;
    let action: string;

    if (existing) {
      // Update existing lead
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...newTags]));
      const updates: Record<string, unknown> = {
        updated_at: now,
        last_activity_at: now,
        tags: mergedTags,
      };
      if (full_name) updates.full_name = full_name;
      if (trimmedPhone) updates.phone = trimmedPhone;
      if (source) updates.source = source;
      if (status) updates.status = status;
      if (score !== undefined && score !== null) updates.score = score;
      if (notes) updates.notes = notes;

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", existing.id);
      if (error) throw error;

      leadId = existing.id;
      action = "updated";
    } else {
      // Create new lead
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          user_id: ownerId,
          full_name: full_name || null,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          source: source || "Make.com",
          status: status || "New",
          score: score ?? 10,
          tags: newTags.length ? newTags : ["make-ingest"],
          notes: notes || null,
          last_activity_at: now,
        })
        .select("id")
        .single();
      if (error) throw error;

      leadId = newLead.id;
      action = "created";
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
      type: event?.type || "opt_in",
      meta: activityMeta,
      ...(event?.timestamp ? { created_at: event.timestamp } : {}),
    });

    return new Response(
      JSON.stringify({ ok: true, action, lead_id: leadId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
