import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeString, isValidEmail, sanitizeTags, safeErrorResponse } from "../_shared/validation.ts";

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

    // Validate and sanitize inputs
    const email = sanitizeString(body.email, 255);
    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const full_name = sanitizeString(body.full_name, 100);
    const phone = sanitizeString(body.phone, 20);
    const source = sanitizeString(body.source, 100);
    const notes = sanitizeString(body.notes, 1000);
    const tags = sanitizeTags(body.tags);
    const meta = typeof body.meta === "object" && body.meta !== null ? body.meta : {};

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

    // Get the owner's first workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "No workspace found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = membership.workspace_id;
    const normalizedEmail = email.toLowerCase();

    // Check for existing lead with same email within workspace
    const { data: existing } = await supabase
      .from("leads")
      .select("id, tags")
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    let leadId: string;
    const now = new Date().toISOString();
    const newTags = tags.length > 0 ? tags : ["website-signup"];

    if (existing) {
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...newTags]));
      const { error } = await supabase
        .from("leads")
        .update({
          updated_at: now,
          last_activity_at: now,
          tags: mergedTags,
          ...(full_name ? { full_name } : {}),
          ...(phone ? { phone } : {}),
          ...(notes ? { notes } : {}),
        })
        .eq("id", existing.id);
      if (error) throw error;
      leadId = existing.id;
    } else {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          user_id: ownerId,
          workspace_id: workspaceId,
          full_name: full_name || null,
          email: normalizedEmail,
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
      workspace_id: workspaceId,
      type: "form_submit",
      meta: meta,
    });

    // --- New lead notification (only for brand-new leads) ---
    if (!existing) {
      const leadName = full_name || normalizedEmail;

      // 1. In-app notification
      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: ownerId,
        title: `New lead: ${leadName}`,
        body: `${normalizedEmail}${source ? ` via ${source}` : ""}`,
        type: "new_lead",
        meta: { lead_id: leadId, email: normalizedEmail, source },
      });

      // 2. Email notification to workspace owner
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";

        if (resendKey) {
          // Get owner email
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", ownerId)
            .single();

          if (ownerProfile?.email) {
            const dashUrl = `https://nexusflo24.lovable.app/dashboard/${workspaceId}/leads`;
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: emailFrom,
                to: [ownerProfile.email],
                subject: `🎯 New Lead: ${leadName}`,
                html: `
                  <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <h2 style="color:#0B1F3B;margin:0 0 4px;">New Lead Captured!</h2>
                      <p style="color:#666;margin:0;font-size:14px;">Someone just signed up through your funnel.</p>
                    </div>
                    <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:24px;">
                      <table style="width:100%;font-size:14px;color:#333;">
                        <tr><td style="padding:4px 8px;font-weight:600;">Name</td><td style="padding:4px 8px;">${full_name || "—"}</td></tr>
                        <tr><td style="padding:4px 8px;font-weight:600;">Email</td><td style="padding:4px 8px;">${normalizedEmail}</td></tr>
                        ${phone ? `<tr><td style="padding:4px 8px;font-weight:600;">Phone</td><td style="padding:4px 8px;">${phone}</td></tr>` : ""}
                        <tr><td style="padding:4px 8px;font-weight:600;">Source</td><td style="padding:4px 8px;">${source || "Landing Page"}</td></tr>
                      </table>
                    </div>
                    <div style="text-align:center;">
                      <a href="${dashUrl}" style="display:inline-block;background:#0B1F3B;color:#D4AF37;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View in CRM →</a>
                    </div>
                    <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">NexusFlo24 • AI-Powered Marketing Automation</p>
                  </div>
                `,
              }),
            });
          }
        }
      } catch (emailErr) {
        // Email notification failure should never block lead capture
        console.error("Email notification failed:", emailErr);
      }
    }

    // --- Trigger matching automations for new leads ---
    if (!existing) {
      try {
        const { data: automations } = await supabase
          .from("automations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("trigger_type", "new_lead")
          .eq("status", "active");

        if (automations && automations.length > 0) {
          const execUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-automation`;
          for (const auto of automations) {
            try {
              await fetch(execUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ automation_id: auto.id, lead_id: leadId, workspace_id: workspaceId }),
              });
            } catch (e) {
              console.error(`Failed to trigger automation ${auto.id}:`, e);
            }
          }
        }
      } catch (autoErr) {
        console.error("Automation trigger error:", autoErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, leadId, updated: !!existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: safeErrorResponse(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
