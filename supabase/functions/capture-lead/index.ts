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

    // Lead destination config from funnel step
    const leadDest = typeof body.lead_destination === "object" && body.lead_destination !== null ? body.lead_destination : {};
    const destTags: string[] = Array.isArray(leadDest.apply_tags) ? leadDest.apply_tags : [];
    const destSource = sanitizeString(leadDest.source, 100);
    const destPipelineStage = sanitizeString(leadDest.pipeline_stage, 50) || "new_lead";
    const destFolderName = sanitizeString(leadDest.folder_name, 100);

    // Campaign/funnel names from meta
    const campaignName = sanitizeString(body.campaign_name || meta.campaign_name, 200);
    const funnelName = sanitizeString(body.funnel_name || meta.funnel_name, 200);

    let ownerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) ownerId = user.id;
    }

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

    const { data: existing } = await supabase
      .from("leads")
      .select("id, tags")
      .eq("workspace_id", workspaceId)
      .eq("user_id", ownerId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    let leadId: string;
    const now = new Date().toISOString();
    const allTags = Array.from(new Set([...tags, ...destTags]));
    const newTags = allTags.length > 0 ? allTags : ["website-signup"];
    const finalSource = destSource || source || "Landing Page";

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
          ...(campaignName ? { campaign_name: campaignName } : {}),
          ...(funnelName ? { funnel_name: funnelName } : {}),
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
          source: finalSource,
          status: "New",
          score: 10,
          tags: newTags,
          notes: notes || null,
          last_activity_at: now,
          pipeline_stage: destPipelineStage,
          campaign_name: campaignName || null,
          funnel_name: funnelName || null,
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

    // --- Auto-route to folders based on routing rules ---
    try {
      const { data: rules } = await supabase
        .from("lead_routing_rules")
        .select("folder_id, match_field, match_value")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      if (rules && rules.length > 0) {
        const matchedFolderIds = new Set<string>();

        for (const rule of rules) {
          let matches = false;
          if (rule.match_field === "source" && finalSource.toLowerCase() === rule.match_value.toLowerCase()) {
            matches = true;
          } else if (rule.match_field === "campaign_name" && campaignName?.toLowerCase() === rule.match_value.toLowerCase()) {
            matches = true;
          } else if (rule.match_field === "funnel_name" && funnelName?.toLowerCase() === rule.match_value.toLowerCase()) {
            matches = true;
          } else if (rule.match_field === "tag" && newTags.some(t => t.toLowerCase() === rule.match_value.toLowerCase())) {
            matches = true;
          }
          if (matches) matchedFolderIds.add(rule.folder_id);
        }

        for (const folderId of matchedFolderIds) {
          // Check if not already in folder
          const { data: existing } = await supabase
            .from("lead_folder_leads")
            .select("id")
            .eq("lead_id", leadId)
            .eq("folder_id", folderId)
            .maybeSingle();

          if (!existing) {
            await supabase.from("lead_folder_leads").insert({
              workspace_id: workspaceId,
              folder_id: folderId,
              lead_id: leadId,
            });
          }
        }
      }

      // Also route by folder_name from lead destination
      if (destFolderName) {
        const { data: folder } = await supabase
          .from("lead_folders")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("name", destFolderName)
          .maybeSingle();

        if (folder) {
          const { data: existingLink } = await supabase
            .from("lead_folder_leads")
            .select("id")
            .eq("lead_id", leadId)
            .eq("folder_id", folder.id)
            .maybeSingle();

          if (!existingLink) {
            await supabase.from("lead_folder_leads").insert({
              workspace_id: workspaceId,
              folder_id: folder.id,
              lead_id: leadId,
            });
          }
        }
      }
    } catch (routeErr) {
      console.error("Routing error:", routeErr);
    }

    // --- New lead notification (only for brand-new leads) ---
    if (!existing) {
      const leadName = full_name || normalizedEmail;

      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: ownerId,
        title: `New lead: ${leadName}`,
        body: `${normalizedEmail}${finalSource ? ` via ${finalSource}` : ""}`,
        type: "new_lead",
        meta: { lead_id: leadId, email: normalizedEmail, source: finalSource },
      });

      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";

        if (resendKey) {
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
                        <tr><td style="padding:4px 8px;font-weight:600;">Source</td><td style="padding:4px 8px;">${finalSource}</td></tr>
                        <tr><td style="padding:4px 8px;font-weight:600;">Pipeline</td><td style="padding:4px 8px;">${destPipelineStage}</td></tr>
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
        console.error("Email notification failed:", emailErr);
      }
    }

    // --- Trigger matching automations ---
    if (!existing) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      try {
        const capturedFunnelId = meta?.funnel_id || null;

        const { data: automations } = await supabase
          .from("automations")
          .select("id, trigger_config")
          .eq("workspace_id", workspaceId)
          .eq("trigger_type", "new_lead")
          .eq("status", "active");

        if (automations && automations.length > 0) {
          const execUrl = `${supabaseUrl}/functions/v1/execute-automation`;
          for (const auto of automations) {
            const cfg = auto.trigger_config as Record<string, unknown> | null;

            // Funnel ID filter
            const autoFunnelId = cfg?.funnel_id as string | undefined;
            if (autoFunnelId && autoFunnelId !== capturedFunnelId) continue;

            // Source filter
            const autoSource = cfg?.source as string | undefined;
            if (autoSource && autoSource.toLowerCase() !== finalSource.toLowerCase()) continue;

            // Funnel name filter (contains match)
            const autoFunnelName = cfg?.funnel_name as string | undefined;
            if (autoFunnelName && !(funnelName || "").toLowerCase().includes(autoFunnelName.toLowerCase())) continue;

            // Tags filter (lead must have ALL specified tags)
            const autoTags = cfg?.tags as string[] | undefined;
            if (autoTags && autoTags.length > 0) {
              const leadTagsLower = newTags.map(t => t.toLowerCase());
              const allMatch = autoTags.every(t => leadTagsLower.includes(t.toLowerCase()));
              if (!allMatch) continue;
            }

            try {
              await fetch(execUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${svcKey}`,
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

      try {
        const { data: triggeredCampaigns } = await supabase
          .from("campaigns")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("campaign_mode", "triggered")
          .eq("status", "active")
          .contains("trigger_config", { type: "new_lead" });

        if (triggeredCampaigns && triggeredCampaigns.length > 0) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const execCampaignUrl = `${supabaseUrl}/functions/v1/execute-campaign`;
          for (const camp of triggeredCampaigns) {
            try {
              await fetch(execCampaignUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${svcKey}`,
                },
                body: JSON.stringify({ campaign_id: camp.id, lead_ids: [leadId] }),
              });
            } catch (e) {
              console.error(`Failed to trigger campaign ${camp.id}:`, e);
            }
          }
        }
      } catch (campErr) {
        console.error("Campaign trigger error:", campErr);
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
