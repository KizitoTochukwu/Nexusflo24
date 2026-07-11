import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdminUser } from "../_shared/credit-guard.ts";
import { buildLeadVars, interpolateText } from "../_shared/interpolate-vars.ts";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";
import { enforceWaPacing } from "../_shared/wa-rate-limit.ts";
import { parseBlocksFromMessage, interpolateBlocks, blocksToHtml, blocksToText } from "../_shared/email-blocks.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { campaign_id, lead_ids } = body;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load campaign
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = campaign.workspace_id;

    // Authorize caller: internal (service-role) or workspace member
    const authz = await requireInternalOrWorkspaceMember(req, supabase, workspaceId);
    if (authz) {
      // Ensure CORS headers on auth failure responses too
      const body = await authz.text();
      return new Response(body, {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if workspace owner is admin → skip credits
    const { data: ws } = await supabase.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
    const ownerIsAdmin = ws?.owner_user_id ? await isAdminUser(ws.owner_user_id) : false;
    if (ownerIsAdmin) console.log("[execute-campaign] Admin workspace — credits exempt");

    const channel = campaign.type;
    const content = (campaign.message_content || {}) as {
      subject?: string;
      body?: string;
      templateSettings?: Record<string, any>;
      whatsappTemplate?: {
        id?: string;
        name?: string;
        language?: string;
        contentSid?: string;
        contentVariables?: Record<string, string>;
        components?: any[];
      };
    };
    const audienceFilter = (campaign.audience_filter || {}) as {
      statuses?: string[];
      tags?: string[];
      lead_ids?: string[];
      min_score?: number;
      max_score?: number;
    };
    const fallback = (campaign.fallback_settings || {}) as {
      enabled?: boolean;
      channel?: string;
      delay_minutes?: number;
      condition?: string;
    };

    // Resolve audience
    let leadsQuery = supabase
      .from("leads")
      .select("id, email, phone, full_name, status, score, tags")
      .eq("workspace_id", workspaceId);

    // Check lead_ids from request body OR from saved audience_filter
    const resolvedLeadIds = (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0)
      ? lead_ids
      : (audienceFilter.lead_ids && audienceFilter.lead_ids.length > 0)
        ? audienceFilter.lead_ids
        : null;

    if (resolvedLeadIds) {
      leadsQuery = leadsQuery.in("id", resolvedLeadIds);
    } else {
      // Apply audience filters
      if (audienceFilter.statuses?.length) {
        leadsQuery = leadsQuery.in("status", audienceFilter.statuses);
      }
      if (audienceFilter.min_score !== undefined && audienceFilter.min_score !== null) {
        leadsQuery = leadsQuery.gte("score", audienceFilter.min_score);
      }
      if (audienceFilter.max_score !== undefined && audienceFilter.max_score !== null) {
        leadsQuery = leadsQuery.lte("score", audienceFilter.max_score);
      }
    }

    const { data: leads, error: leadsErr } = await leadsQuery.limit(500);
    if (leadsErr) throw leadsErr;

    if (!leads || leads.length === 0) {
      // Update campaign to completed with 0 sent
      await supabase.from("campaigns").update({
        status: "completed", sent_count: 0, updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No matching leads" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by tags if specified (array overlap)
    let filteredLeads = leads;
    if (audienceFilter.tags?.length && !lead_ids?.length) {
      filteredLeads = leads.filter((lead: any) => {
        const leadTags: string[] = lead.tags || [];
        return audienceFilter.tags!.some((t) => leadTags.includes(t));
      });
    }

    // Skip unsubscribed leads and count them
    const beforeUnsub = filteredLeads.length;
    filteredLeads = filteredLeads.filter((lead: any) => {
      const leadTags: string[] = lead.tags || [];
      return !leadTags.includes("unsubscribed");
    });
    const skippedUnsubscribed = beforeUnsub - filteredLeads.length;

    // Determine channels to fan-out on. For multi-channel, use content.channels
    // if provided (e.g. ["email","whatsapp","sms"]), otherwise default to all 3.
    const allChannels: Array<"email" | "whatsapp" | "sms"> =
      channel === "multi-channel"
        ? (Array.isArray((content as any).channels) && (content as any).channels.length > 0
            ? ((content as any).channels as Array<"email" | "whatsapp" | "sms">)
            : ["email", "whatsapp", "sms"])
        : [channel as "email" | "whatsapp" | "sms"];

    // Notification helper for zero-send outcomes
    const notifyZeroSend = async (reason: string) => {
      try {
        const { data: wsRec } = await supabase.from("workspaces")
          .select("owner_user_id").eq("id", workspaceId).maybeSingle();
        if (wsRec?.owner_user_id) {
          await supabase.from("notifications").insert({
            workspace_id: workspaceId,
            user_id: wsRec.owner_user_id,
            title: `Campaign "${campaign.name}" sent to 0 recipients`,
            body: reason,
            type: "campaign_zero_send",
            meta: { campaign_id, reason },
          });
        }
      } catch (e) { console.error("notifyZeroSend failed:", (e as Error).message); }
    };

    if (filteredLeads.length === 0) {
      const reason = skippedUnsubscribed > 0
        ? `${skippedUnsubscribed} lead(s) skipped — all recipients are unsubscribed.`
        : "No matching leads for this audience.";
      await supabase.from("campaigns").update({
        status: "failed", sent_count: 0, updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);
      await notifyZeroSend(reason);
      return new Response(JSON.stringify({
        ok: true, sent: 0, failed: 0, total: 0,
        skipped_unsubscribed: skippedUnsubscribed,
        skipped_missing_contact: 0,
        message: reason,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedMissingContact = 0;
    const results: Array<{ lead_id: string; channel: string; status: string; error?: string }> = [];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Render a body per channel from the stored message (may be block-JSON).
    const renderBody = (raw: string, target: "html" | "text", vars: Record<string, string>): string => {
      const blocks = parseBlocksFromMessage(raw || "");
      if (blocks) {
        const interpolated = interpolateBlocks(blocks, (s) => interpolateText(s, vars));
        return target === "html" ? blocksToHtml(interpolated) : blocksToText(interpolated);
      }
      // Plain-text / HTML fallback
      const interp = interpolateText(raw || "", vars);
      if (target === "text") {
        // Strip any stray HTML for WA/SMS
        return interp.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
      }
      return interp;
    };

    for (let i = 0; i < filteredLeads.length; i++) {
      const lead = filteredLeads[i];
      if (i > 0) await sleep(550);

      const vars = buildLeadVars(lead);
      const rawSubject = interpolateText(content.subject || "", vars).trim();
      const messageSubject = rawSubject || (campaign.name || "Message from NexusFlo24");

      // Check contact availability once for this lead across chosen channels
      const hasContactForAny = allChannels.some((ch) =>
        (ch === "email" && !!lead.email) || ((ch === "whatsapp" || ch === "sms") && !!lead.phone)
      );
      if (!hasContactForAny) {
        skippedMissingContact++;
        continue;
      }

      let leadAllFailed = true;
      let lastError: string | undefined;
      let lastSubject = messageSubject;
      let lastTextBody = "";

      for (const ch of allChannels) {
        // Skip channels the lead can't receive on
        if (ch === "email" && !lead.email) continue;
        if ((ch === "whatsapp" || ch === "sms") && !lead.phone) continue;

        const htmlBody = renderBody(content.body || "", "html", vars);
        const textBody = renderBody(content.body || "", "text", vars);
        lastTextBody = textBody || htmlBody;

        let deliveryStatus: "delivered" | "failed" = "failed";
        let sendError: string | undefined;

        try {
          if (ch === "email") {
            const res = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                workspaceId, to: lead.email,
                subject: messageSubject, html: htmlBody,
                leadId: lead.id, campaignId: campaign_id,
                templateSettings: content.templateSettings || undefined,
                senderProfileId: (content as any).sender_profile_id_email || (content as any).sender_profile_id || null,
                ...(ownerIsAdmin ? { skipCredits: true } : {}),
              }),
            });
            const data = await res.json();
            deliveryStatus = data.success ? "delivered" : "failed";
            if (!data.success) sendError = data.error || "Email send failed";
          } else if (ch === "whatsapp") {
            await enforceWaPacing(workspaceId);
            const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                workspaceId, to: lead.phone, body: textBody || messageSubject,
                leadId: lead.id, campaignId: campaign_id,
                senderProfileId: (content as any).sender_profile_id_whatsapp || (content as any).sender_profile_id || null,
                ...(content.whatsappTemplate
                  ? {
                      template: {
                        ...content.whatsappTemplate,
                        contentVariables: Object.fromEntries(
                          Object.entries(content.whatsappTemplate.contentVariables || {}).map(
                            ([k, v]) => [k, interpolateText(String(v ?? ""), vars)],
                          ),
                        ),
                      },
                    }
                  : {}),
                ...(ownerIsAdmin ? { skipCredits: true } : {}),
              }),
            });
            const data = await res.json();
            deliveryStatus = data.success ? "delivered" : "failed";
            if (!data.success) {
              sendError = data.error || (data.reason === "window_closed"
                ? "WhatsApp 24h window closed"
                : "WhatsApp send failed");
            }
          } else if (ch === "sms") {
            const res = await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                workspaceId, to: lead.phone, message: textBody || messageSubject,
                leadId: lead.id, campaignId: campaign_id,
                senderProfileId: (content as any).sender_profile_id_sms || (content as any).sender_profile_id || null,
                ...(ownerIsAdmin ? { skipCredits: true } : {}),
              }),
            });
            const data = await res.json();
            deliveryStatus = data.success ? "delivered" : "failed";
            if (!data.success) sendError = data.error || "SMS send failed";
          }
        } catch (err: any) {
          deliveryStatus = "failed";
          sendError = err?.message || "Send error";
        }

        await supabase.from("campaign_messages").insert({
          campaign_id, workspace_id: workspaceId, lead_id: lead.id,
          channel: ch,
          delivery_status: deliveryStatus,
          error: deliveryStatus === "failed" ? (sendError || "Unknown send error") : null,
        });

        if (deliveryStatus === "delivered") {
          sentCount++;
          leadAllFailed = false;
        } else {
          failedCount++;
          lastError = sendError;
        }
        results.push({ lead_id: lead.id, channel: ch, status: deliveryStatus, error: sendError });
      }

      // Fallback: only fire when EVERY primary channel for this lead failed.
      if (fallback?.enabled && leadAllFailed && fallback.channel
          && !allChannels.includes(fallback.channel as any)) {
        await supabase.from("scheduled_jobs").insert({
          workspace_id: workspaceId,
          automation_id: campaign_id,
          lead_id: lead.id,
          step_index: 0,
          run_at: new Date().toISOString(),
          payload: {
            type: "campaign_fallback",
            campaign_id, lead_id: lead.id, workspace_id: workspaceId,
            channel: fallback.channel, subject: lastSubject, body: lastTextBody,
            reason: "primary_send_failed",
          },
        });
      }
    }

    // Update campaign stats
    const totalTargeted = filteredLeads.length;
    const finalStatus = sentCount === 0 ? "failed" : "completed";
    await supabase.from("campaigns").update({
      sent_count: sentCount,
      status: finalStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    if (sentCount === 0) {
      const reasons: string[] = [];
      if (skippedUnsubscribed > 0) reasons.push(`${skippedUnsubscribed} unsubscribed`);
      if (skippedMissingContact > 0) reasons.push(`${skippedMissingContact} missing contact info`);
      if (failedCount > 0) reasons.push(`${failedCount} provider failure(s)`);
      await notifyZeroSend(
        `Campaign "${campaign.name}" delivered 0 messages${reasons.length ? ` — ${reasons.join(", ")}` : ""}.`
      );
    }

    return new Response(JSON.stringify({
      ok: true, sent: sentCount, failed: failedCount,
      total: totalTargeted,
      skipped_unsubscribed: skippedUnsubscribed,
      skipped_missing_contact: skippedMissingContact,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("execute-campaign error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Execution failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

