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
      whatsappTemplate?: { name: string; language: string; components?: any[] };
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

    // Skip unsubscribed leads
    filteredLeads = filteredLeads.filter((lead: any) => {
      const leadTags: string[] = lead.tags || [];
      return !leadTags.includes("unsubscribed");
    });

    if (filteredLeads.length === 0) {
      await supabase.from("campaigns").update({
        status: "completed", sent_count: 0, updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      return new Response(JSON.stringify({ ok: true, sent: 0, message: "All matching leads are unsubscribed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ lead_id: string; status: string; error?: string }> = [];

    // Rate-limit helper: wait between sends to avoid provider throttling (Resend = 2 req/s)
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < filteredLeads.length; i++) {
      const lead = filteredLeads[i];

      // Throttle: wait 550ms between requests to stay under 2 req/s
      if (i > 0) await sleep(550);
      const vars = buildLeadVars(lead);
      const rawSubject = interpolateText(content.subject || "", vars).trim();
      // Auto-fill subject from campaign name when missing so multi-channel
      // campaigns don't fail on the email leg.
      const messageSubject = rawSubject || (campaign.name || "Message from NexusFlo24");
      const messageBody = interpolateText(content.body || "", vars);

      let deliveryStatus = "pending";
      let sendError: string | undefined;

      try {
        const effectiveChannel = channel === "multi-channel" ? "email" : channel;

        if (effectiveChannel === "email" && lead.email) {
          const res = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              workspaceId, to: lead.email,
              subject: messageSubject, html: messageBody,
              leadId: lead.id, campaignId: campaign_id,
              templateSettings: content.templateSettings || undefined,
              senderProfileId: content.sender_profile_id_email || content.sender_profile_id || null,
              ...(ownerIsAdmin ? { skipCredits: true } : {}),
            }),
          });
          const data = await res.json();
          deliveryStatus = data.success ? "delivered" : "failed";
          if (!data.success) sendError = data.error;
        } else if (effectiveChannel === "whatsapp" && lead.phone) {
          // WA-specific pacing (~25 msg/sec/phone) sits on top of the 550ms
          // per-lead throttle so bursty campaigns don't trip Meta's per-second cap.
          await enforceWaPacing(workspaceId);
          const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              workspaceId, to: lead.phone, body: messageBody,
              leadId: lead.id, campaignId: campaign_id,
              senderProfileId: content.sender_profile_id_whatsapp || content.sender_profile_id || null,
              ...(content.whatsappTemplate ? { template: content.whatsappTemplate } : {}),
              ...(ownerIsAdmin ? { skipCredits: true } : {}),
            }),
          });
          const data = await res.json();
          deliveryStatus = data.success ? "delivered" : "failed";
          if (!data.success) {
            // window_closed / fallback signal flows through the same failed
            // branch below — the configured fallback channel will fire
            // immediately because deliveryStatus === "failed".
            sendError = data.error || (data.reason === "window_closed"
              ? "WhatsApp 24h window closed"
              : "WhatsApp send failed");
          }
        } else if (effectiveChannel === "sms" && lead.phone) {
          const res = await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              workspaceId, to: lead.phone, message: messageBody,
              leadId: lead.id, campaignId: campaign_id,
              senderProfileId: content.sender_profile_id_sms || content.sender_profile_id || null,
              ...(ownerIsAdmin ? { skipCredits: true } : {}),
            }),
          });
          const data = await res.json();
          deliveryStatus = data.success ? "delivered" : "failed";
          if (!data.success) sendError = data.error;
        } else {
          deliveryStatus = "failed";
          sendError = `No ${effectiveChannel} contact info for lead`;
        }
      } catch (err: any) {
        deliveryStatus = "failed";
        sendError = err?.message || "Send error";
      }

      // Insert campaign_message row (with error text on failure)
      await supabase.from("campaign_messages").insert({
        campaign_id, workspace_id: workspaceId, lead_id: lead.id,
        channel: channel === "multi-channel" ? "email" : channel,
        delivery_status: deliveryStatus,
        error: deliveryStatus === "failed" ? (sendError || "Unknown send error") : null,
      });

      if (deliveryStatus === "delivered") {
        sentCount++;
      } else {
        failedCount++;
      }

      results.push({ lead_id: lead.id, status: deliveryStatus, error: sendError });

      // Schedule fallback if enabled and primary failed/pending.
      // When the PRIMARY send fails outright (no delivery happened),
      // run the fallback immediately instead of waiting the configured
      // "unread" delay — there's nothing to wait for.
      if (fallback?.enabled && deliveryStatus === "failed" && fallback.channel) {
        const runAt = new Date().toISOString();
        await supabase.from("scheduled_jobs").insert({
          workspace_id: workspaceId,
          automation_id: campaign_id, // reuse field for campaign reference
          lead_id: lead.id,
          step_index: 0,
          run_at: runAt,
          payload: {
            type: "campaign_fallback",
            campaign_id, lead_id: lead.id, workspace_id: workspaceId,
            channel: fallback.channel, subject: messageSubject, body: messageBody,
            reason: "primary_send_failed",
          },
        });
      }
    }

    // Update campaign stats
    const totalTargeted = filteredLeads.length;
    await supabase.from("campaigns").update({
      sent_count: sentCount,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({
      ok: true, sent: sentCount, failed: failedCount,
      total: totalTargeted, results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("execute-campaign error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Execution failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
