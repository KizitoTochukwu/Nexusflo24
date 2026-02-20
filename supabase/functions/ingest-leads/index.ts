import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-workspace-id",
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

    // Workspace-aware: prefer X-Workspace-Id header, fallback to owner's first workspace
    let workspaceId = req.headers.get("X-Workspace-Id");

    if (workspaceId) {
      // Validate workspace exists
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
      // Fallback: get owner's first workspace
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
    if (!workspaceId) activityMeta.warning = "X-Workspace-Id not provided, used fallback";

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: ownerId,
      workspace_id: workspaceId,
      type: event?.type || "opt_in",
      meta: activityMeta,
      ...(event?.timestamp ? { created_at: event.timestamp } : {}),
    });

    return new Response(
      JSON.stringify({ ok: true, action, lead_id: leadId, workspace_id: workspaceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
