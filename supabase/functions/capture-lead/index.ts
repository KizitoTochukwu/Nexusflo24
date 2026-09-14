import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeString, isValidEmail, sanitizeTags, safeErrorResponse } from "../_shared/validation.ts";
import { normalizePhoneE164 } from "../_shared/phone.ts";
import { upsertCanonicalContact, linkLeadToContact, recordContactTimeline } from "../_shared/canonicalContact.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Best-effort: fire automations matching trigger_type=lead_added_to_folder for a single lead
async function fireFolderAutomations(
  supabase: any,
  workspaceId: string,
  leadId: string,
  folderId: string,
) {
  try {
    const { data: autos } = await supabase
      .from("automations")
      .select("id, trigger_config")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", "lead_added_to_folder");

    const matched = (autos ?? []).filter((a: any) => {
      const cfg = a.trigger_config ?? {};
      const cfgFolder = cfg.folder_id;
      if (!cfgFolder) return true; // any folder
      return String(cfgFolder) === String(folderId);
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    for (const auto of matched) {
      fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          automation_id: auto.id,
          workspace_id: workspaceId,
          lead_id: leadId,
        }),
      }).catch(() => { /* best effort */ });
    }
  } catch (e) {
    console.error("[capture-lead] fireFolderAutomations error:", e);
  }
}

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

    // ---------------------------------------------------------------
    // Spam protection for public form submissions (honeypot, timing,
    // per-IP rate limit, disposable email blocking). Only applies when
    // the submission comes from a stored form (body.form_id present).
    // ---------------------------------------------------------------
    const spamFormId = typeof body.form_id === "string" ? body.form_id : null;
    if (spamFormId) {
      const { data: spamForm } = await supabase
        .from("forms")
        .select("settings")
        .eq("id", spamFormId)
        .maybeSingle();

      const spam = (spamForm?.settings as any)?.spam ?? {};
      const honeypotOn = spam.honeypot !== false;
      const minSeconds = Number(spam.min_seconds ?? 2);
      const rateLimit = Number(spam.rate_limit_per_hour ?? 20);
      const blockDisposable = spam.block_disposable_email === true;

      const rejected = (reason: string) => {
        console.warn("[capture-lead] spam rejected:", reason, spamFormId);
        return new Response(JSON.stringify({ error: "Submission rejected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      };

      if (honeypotOn && typeof body.hp_field === "string" && body.hp_field.trim() !== "") {
        return rejected("honeypot");
      }

      const elapsed = Number(body.elapsed_ms);
      if (minSeconds > 0 && Number.isFinite(elapsed) && elapsed < minSeconds * 1000) {
        return rejected("too_fast");
      }

      if (blockDisposable) {
        const domain = String(body.email ?? "").split("@")[1]?.toLowerCase() ?? "";
        const disposable = [
          "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
          "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com",
          "getnada.com", "dispostable.com", "fakeinbox.com", "throwawaymail.com",
        ];
        if (domain && disposable.includes(domain)) return rejected("disposable_email");
      }

      if (rateLimit > 0) {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          req.headers.get("cf-connecting-ip") ||
          "unknown";
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${spamFormId}:${ip}`),
        );
        const ipHash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const since = new Date(Date.now() - 3600_000).toISOString();

        const { count } = await supabase
          .from("form_rate_limit")
          .select("id", { count: "exact", head: true })
          .eq("form_id", spamFormId)
          .eq("ip_hash", ipHash)
          .gte("created_at", since);

        if ((count ?? 0) >= rateLimit) {
          return new Response(
            JSON.stringify({ error: "Too many submissions. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        await supabase.from("form_rate_limit").insert({ form_id: spamFormId, ip_hash: ipHash });
      }
    }


    const email = sanitizeString(body.email, 255);
    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const full_name = sanitizeString(body.full_name, 100);
    const rawPhone = sanitizeString(body.phone, 30);
    const phone = rawPhone ? normalizePhoneE164(rawPhone) : null;
    if (rawPhone && !phone) {
      return new Response(JSON.stringify({ error: "Invalid phone format. Use international format like +447517327597." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const source = sanitizeString(body.source, 100);
    const notes = sanitizeString(body.notes, 1000);
    const tags = sanitizeTags(body.tags);
    const meta = typeof body.meta === "object" && body.meta !== null ? body.meta : {};

    // SMS consent (Twilio A2P compliance). Only persist when the visitor
    // explicitly checked the box on the originating form.
    const smsConsent = body.sms_consent === true;
    const smsConsentText = smsConsent ? sanitizeString(body.sms_consent_text, 2000) : null;
    const smsConsentSource = smsConsent ? sanitizeString(body.sms_consent_source, 200) : null;
    const smsConsentTimestamp = smsConsent
      ? (typeof body.sms_consent_timestamp === "string" ? body.sms_consent_timestamp : new Date().toISOString())
      : null;

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

    // Prefer the workspace explicitly provided by the public form/funnel.
    // Fallback to the authenticated user's first workspace, then to the first profile.
    let workspaceId: string | null =
      typeof body.workspace_id === "string" && body.workspace_id ? body.workspace_id : null;

    if (!workspaceId && ownerId) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (membership) workspaceId = membership.workspace_id;
    }

    if (!workspaceId) {
      // Last-resort fallback for legacy single-tenant calls
      const { data: firstProfile } = await supabase
        .from("profiles")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (firstProfile) {
        ownerId = ownerId ?? firstProfile.id;
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", firstProfile.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (membership) workspaceId = membership.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "No workspace found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure ownerId is set (fallback to workspace owner)
    if (!ownerId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .maybeSingle();
      ownerId = ws?.owner_user_id ?? null;
    }
    const normalizedEmail = email.toLowerCase();

    // Deduplicate by email first, then by phone if no email match.
    // Phone lookup is workspace-wide (not user-scoped) to avoid colliding
    // with the (user_id, phone) unique constraint on a lead owned by another rep.
    let existing: { id: string; tags: string[] | null; user_id?: string } | null = null;

    const { data: emailMatch } = await supabase
      .from("leads")
      .select("id, tags, user_id")
      .eq("workspace_id", workspaceId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    existing = emailMatch;
    if (existing?.user_id) ownerId = existing.user_id;

    if (!existing && phone) {
      const { data: phoneMatch } = await supabase
        .from("leads")
        .select("id, tags, user_id")
        .eq("workspace_id", workspaceId)
        .eq("phone", phone)
        .maybeSingle();

      if (phoneMatch) {
        existing = phoneMatch;
        ownerId = phoneMatch.user_id ?? ownerId;
      }
    }

    let leadId: string;
    const now = new Date().toISOString();
    const allTags = Array.from(new Set([...tags, ...destTags]));
    const newTags = allTags.length > 0 ? allTags : ["website-signup"];
    const finalSource = destSource || source || "Landing Page";

    // --- Round-robin assignment (only for brand-new leads) ---
    let assignedOwnerId: string | null = null;
    if (!existing) {
      try {
        const { data: rrUserId } = await supabase.rpc("assign_next_round_robin", {
          _workspace_id: workspaceId,
        });
        if (rrUserId && typeof rrUserId === "string") {
          assignedOwnerId = rrUserId;
        }
      } catch (rrErr) {
        console.error("Round-robin assignment failed:", rrErr);
      }
    }
    // Fallback: assign to owner if round-robin disabled or unavailable
    const notifyUserId = assignedOwnerId || ownerId;

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
          // Backfill email if the existing lead had none
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
          // Only upgrade SMS consent — never downgrade or overwrite opt-out.
          ...(smsConsent
            ? {
                sms_consent: true,
                sms_consent_text: smsConsentText,
                sms_consent_timestamp: smsConsentTimestamp,
                sms_consent_source: smsConsentSource,
              }
            : {}),
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
          assigned_owner_id: assignedOwnerId,
          sms_consent: smsConsent,
          sms_consent_text: smsConsentText,
          sms_consent_timestamp: smsConsentTimestamp,
          sms_consent_source: smsConsentSource,
        })
        .select("id")
        .single();

      if (error) {
        // Race-condition recovery: if (user_id, phone) collided, merge into existing lead.
        if ((error as any).code === "23505" && phone) {
          const { data: collidedLead } = await supabase
            .from("leads")
            .select("id, tags")
            .eq("workspace_id", workspaceId)
            .eq("phone", phone)
            .maybeSingle();
          if (!collidedLead) throw error;
          const mergedTags = Array.from(new Set([...(collidedLead.tags || []), ...newTags]));
          await supabase
            .from("leads")
            .update({
              updated_at: now,
              last_activity_at: now,
              tags: mergedTags,
              ...(full_name ? { full_name } : {}),
              ...(notes ? { notes } : {}),
              ...(campaignName ? { campaign_name: campaignName } : {}),
              ...(funnelName ? { funnel_name: funnelName } : {}),
              ...(normalizedEmail ? { email: normalizedEmail } : {}),
            })
            .eq("id", collidedLead.id);
          leadId = collidedLead.id;
        } else {
          throw error;
        }
      } else {
        leadId = newLead.id;
      }
    }

    // --- Canonical CRM contact (one person per workspace) ---
    let canonicalContactId: string | null = null;
    try {
      canonicalContactId = await upsertCanonicalContact(supabase, {
        workspaceId,
        email: normalizedEmail,
        phone: phone || null,
        fullName: full_name || null,
        source: finalSource,
        attribution: {
          source: finalSource,
          campaign: campaignName || null,
          funnel: funnelName || null,
          page: (meta as any)?.page ?? null,
          referrer: (meta as any)?.referrer ?? null,
          utm_source: (meta as any)?.utm_source ?? null,
          utm_medium: (meta as any)?.utm_medium ?? null,
          utm_campaign: (meta as any)?.utm_campaign ?? null,
          utm_content: (meta as any)?.utm_content ?? null,
          utm_term: (meta as any)?.utm_term ?? null,
        },
        sourceTable: "leads",
        sourceRecordId: leadId,
      });
      if (canonicalContactId) {
        await linkLeadToContact(supabase, leadId, canonicalContactId);
        await recordContactTimeline(supabase, {
          workspaceId,
          contactId: canonicalContactId,
          activityType: "lead_captured",
          title: "Lead captured",
          description: finalSource,
          source: finalSource,
          externalEventId: `lead:${leadId}`,
          meta: { lead_id: leadId },
        });
      }
    } catch (contactErr) {
      console.error("[capture-lead] canonical contact failed:", String(contactErr));
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
    let routedToAnyFolder = false;
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
            routedToAnyFolder = true;
            await fireFolderAutomations(supabase, workspaceId, leadId, folderId);
          } else {
            routedToAnyFolder = true;
          }
        }
      }

      // Also route by folder_name from lead destination.
      // If the folder doesn't exist yet, auto-create it so the form's CRM mapping
      // is truly self-serve (lead lands in the configured folder, never falls
      // through to "Uncategorized" just because the user hasn't pre-created it).
      if (destFolderName) {
        let { data: folder } = await supabase
          .from("lead_folders")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("name", destFolderName)
          .maybeSingle();

        if (!folder) {
          const { data: created, error: createErr } = await supabase
            .from("lead_folders")
            .insert({
              workspace_id: workspaceId,
              user_id: ownerId,
              name: destFolderName,
              color: "#0B1F3B",
            })
            .select("id")
            .maybeSingle();
          if (createErr) {
            console.error("[capture-lead] failed to auto-create folder:", createErr);
          } else {
            folder = created;
          }
        }

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
            await fireFolderAutomations(supabase, workspaceId, leadId, folder.id);
          }
          routedToAnyFolder = true;
        }
      }

      // Also count any pre-existing folder assignment (e.g. from CSV import) as routed
      if (!routedToAnyFolder) {
        const { data: anyFolder } = await supabase
          .from("lead_folder_leads")
          .select("id")
          .eq("lead_id", leadId)
          .limit(1)
          .maybeSingle();
        if (anyFolder) routedToAnyFolder = true;
      }

      // Fallback: assign to "Uncategorized" so no lead is left orphaned
      if (!routedToAnyFolder) {
        let { data: uncatFolder } = await supabase
          .from("lead_folders")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("name", "uncategorized")
          .maybeSingle();

        if (!uncatFolder) {
          const { data: created } = await supabase
            .from("lead_folders")
            .insert({
              workspace_id: workspaceId,
              user_id: ownerId,
              name: "Uncategorized",
              color: "#94A3B8",
            })
            .select("id")
            .single();
          uncatFolder = created;
        }

        if (uncatFolder) {
          await supabase.from("lead_folder_leads").insert({
            workspace_id: workspaceId,
            folder_id: uncatFolder.id,
            lead_id: leadId,
          });
          await fireFolderAutomations(supabase, workspaceId, leadId, uncatFolder.id);
        }
      }
    } catch (routeErr) {
      console.error("Routing error:", routeErr);
    }

    // --- Record form submission (so forms.submission_count trigger fires) ---
    const formId = sanitizeString(body.form_id, 64);
    if (formId) {
      try {
        const submissionData =
          typeof body.form_data === "object" && body.form_data !== null
            ? body.form_data
            : {
                full_name,
                email: normalizedEmail,
                phone,
                ...(typeof body.fields === "object" && body.fields !== null ? body.fields : {}),
              };
        const { error: submissionErr } = await supabase.from("form_submissions").insert({
          form_id: formId,
          workspace_id: workspaceId,
          lead_id: leadId,
          contact_id: canonicalContactId,
          processing_status: canonicalContactId ? "completed" : "received",
          processed_at: new Date().toISOString(),
          data: submissionData,
        });

        if (submissionErr) {
          console.error("[capture-lead] form_submissions insert failed:", submissionErr);
        }
      } catch (submissionExc) {
        console.error("[capture-lead] form_submissions insert exception:", submissionExc);
      }
    }

    // --- New lead notification (only for brand-new leads, only to assigned rep) ---
    if (!existing) {
      const leadName = full_name || normalizedEmail;

      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: notifyUserId,
        title: `New lead: ${leadName}`,
        body: `${normalizedEmail}${finalSource ? ` via ${finalSource}` : ""}${assignedOwnerId ? " (assigned to you)" : ""}`,
        type: "new_lead",
        meta: { lead_id: leadId, email: normalizedEmail, source: finalSource, assigned_owner_id: assignedOwnerId },
      });

      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";

        if (resendKey) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", notifyUserId)
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
    {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const execUrl = `${supabaseUrl}/functions/v1/execute-automation`;
      const enrollUrl = `${supabaseUrl}/functions/v1/enroll-workflow-leads`;

      const capturedFunnelId = (meta as any)?.funnel_id || null;
      const capturedFormId = (meta as any)?.formId || (meta as any)?.form_id || null;

      // Tags actually newly applied to this lead (vs already present on the existing record)
      const previousTags = (existing?.tags || []) as string[];
      const addedTags = newTags.filter((t) => !previousTags.some((p) => String(p).toLowerCase() === String(t).toLowerCase()));

      const dispatchAutomation = async (autoId: string) => {
        try {
          await fetch(execUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
            body: JSON.stringify({ automation_id: autoId, lead_id: leadId, workspace_id: workspaceId }),
          });
        } catch (e) {
          console.error(`[capture-lead] dispatch automation ${autoId} failed:`, e);
        }
      };

      const dispatchWorkflow = async (eventType: string, eventConfig: Record<string, unknown>) => {
        try {
          await fetch(enrollUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
            body: JSON.stringify({
              workspace_id: workspaceId,
              lead_ids: [leadId],
              event_type: eventType,
              event_config: eventConfig,
            }),
          });
        } catch (e) {
          console.error(`[capture-lead] enroll-workflow ${eventType} failed:`, e);
        }
      };

      // Helper: check if lead is associated with a funnel via funnel_visits
      const leadLinkedToFunnel = async (funnelId: string): Promise<boolean> => {
        try {
          const { count } = await supabase
            .from("funnel_visits")
            .select("id", { count: "exact", head: true })
            .eq("funnel_id", funnelId)
            .eq("lead_id", leadId);
          return (count ?? 0) > 0;
        } catch (e) {
          console.error("[capture-lead] funnel association lookup failed:", e);
          return false;
        }
      };

      // 1) new_lead — only for genuinely new leads
      if (!existing) {
        try {
          const { data: automations } = await supabase
            .from("automations")
            .select("id, trigger_config")
            .eq("workspace_id", workspaceId)
            .eq("trigger_type", "new_lead")
            .eq("status", "active");

          for (const auto of automations ?? []) {
            const cfg = (auto.trigger_config ?? {}) as Record<string, unknown>;
            const autoFunnelId = cfg.funnel_id as string | null | undefined;
            if (autoFunnelId) {
              if (autoFunnelId !== capturedFunnelId && !(await leadLinkedToFunnel(autoFunnelId))) continue;
            }
            await dispatchAutomation(auto.id);
          }
          await dispatchWorkflow("new_lead", { funnel_id: capturedFunnelId });
        } catch (autoErr) {
          console.error("[capture-lead] new_lead trigger error:", autoErr);
        }
      }

      // 2) form_submitted — fires for both new and returning leads
      try {
        const { data: automations } = await supabase
          .from("automations")
          .select("id, trigger_config")
          .eq("workspace_id", workspaceId)
          .eq("trigger_type", "form_submitted")
          .eq("status", "active");

        for (const auto of automations ?? []) {
          const cfg = (auto.trigger_config ?? {}) as Record<string, unknown>;
          const autoFormId = cfg.form_id as string | null | undefined;
          const autoFunnelId = cfg.funnel_id as string | null | undefined;
          if (autoFormId && autoFormId !== capturedFormId) continue;
          if (autoFunnelId) {
            if (autoFunnelId !== capturedFunnelId && !(await leadLinkedToFunnel(autoFunnelId))) continue;
          }
          await dispatchAutomation(auto.id);
        }
        await dispatchWorkflow("form_submitted", { form_id: capturedFormId, funnel_id: capturedFunnelId });
      } catch (formErr) {
        console.error("[capture-lead] form_submitted trigger error:", formErr);
      }

      // 3) lead_tagged + tag_added — for each newly applied tag
      if (addedTags.length > 0) {
        try {
          const { data: automations } = await supabase
            .from("automations")
            .select("id, trigger_type, trigger_config")
            .eq("workspace_id", workspaceId)
            .in("trigger_type", ["lead_tagged", "tag_added"])
            .eq("status", "active");

          for (const auto of automations ?? []) {
            const cfg = (auto.trigger_config ?? {}) as Record<string, unknown>;
            const cfgTag = cfg.tag as string | null | undefined;
            if (auto.trigger_type === "tag_added") {
              await dispatchAutomation(auto.id);
              continue;
            }
            // lead_tagged: match if no specific tag set OR any added tag matches
            if (!cfgTag || addedTags.some((t) => String(t).toLowerCase() === String(cfgTag).toLowerCase())) {
              await dispatchAutomation(auto.id);
            }
          }
          for (const tag of addedTags) {
            await dispatchWorkflow("lead_tagged", { tag });
          }
        } catch (tagErr) {
          console.error("[capture-lead] lead_tagged trigger error:", tagErr);
        }
      }

      // 4) Triggered campaigns — only for genuinely new leads
      if (!existing) {
        try {
          const { data: triggeredCampaigns } = await supabase
            .from("campaigns")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("campaign_mode", "triggered")
            .eq("status", "active")
            .contains("trigger_config", { type: "new_lead" });

          if (triggeredCampaigns && triggeredCampaigns.length > 0) {
            const execCampaignUrl = `${supabaseUrl}/functions/v1/execute-campaign`;
            for (const camp of triggeredCampaigns) {
              try {
                await fetch(execCampaignUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
                  body: JSON.stringify({ campaign_id: camp.id, lead_ids: [leadId] }),
                });
              } catch (e) {
                console.error(`Failed to trigger campaign ${camp.id}:`, e);
              }
            }
          }
        } catch (campErr) {
          console.error("[capture-lead] campaign trigger error:", campErr);
        }
      }
    }


    return new Response(JSON.stringify({ ok: true, leadId, updated: !!existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
