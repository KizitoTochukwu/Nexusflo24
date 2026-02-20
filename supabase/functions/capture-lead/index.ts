import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { full_name, email, phone, source, tags, notes, meta } = body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine owner: use auth user if present, otherwise pick the first admin/profile
    let ownerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) ownerId = user.id;
    }

    // For anonymous visitors, assign to the first user in profiles (site owner)
    if (!ownerId) {
      const { data: firstProfile } = await supabase
        .from("profiles")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (!firstProfile) {
        return new Response(JSON.stringify({ error: "No owner configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      ownerId = firstProfile.id;
    }

    // Check for existing lead with same email for this owner
    const { data: existing } = await supabase
      .from("leads")
      .select("id, tags")
      .eq("user_id", ownerId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    let leadId: string;
    const now = new Date().toISOString();
    const newTags = tags || ["website-signup"];

    if (existing) {
      // Merge tags
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...newTags]));
      const { error } = await supabase
        .from("leads")
        .update({
          updated_at: now,
          last_activity_at: now,
          tags: mergedTags,
          ...(full_name ? { full_name } : {}),
          ...(phone ? { phone } : {}),
          ...(notes ? { notes: notes } : {}),
        })
        .eq("id", existing.id);
      if (error) throw error;
      leadId = existing.id;
    } else {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          user_id: ownerId,
          full_name: full_name || null,
          email: email.trim().toLowerCase(),
          phone: phone || null,
          source: source || "Landing Page",
          status: "New",
          score: 10,
          tags: newTags,
          notes: notes || null,
          last_activity_at: now,
        })
        .select("id")
        .single();
      if (error) throw error;
      leadId = newLead.id;
    }

    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: ownerId,
      type: "form_submit",
      meta: meta || {},
    });

    return new Response(JSON.stringify({ ok: true, leadId, updated: !!existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
