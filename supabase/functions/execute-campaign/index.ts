import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const channel = campaign.type;
    const content = (campaign.message_content || {}) as { subject?: string; body?: string };
    const audienceFilter = (campaign.audience_filter || {}) as {
      statuses?: string[];
      tags?: string[];
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

    if (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0) {
      leadsQuery = leadsQuery.in("id", lead_ids);
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

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ lead_id: string; status: string; error?: string }> = [];

    for (const lead of filteredLeads) {
      const leadName = (lead.full_name || "").split(" ")[0] || "there";
      const messageSubject = (content.subject || "").replace(/\{\{first_name\}\}/g, leadName).replace(/\{\{full_name\}\}/g, lead.full_name || "");
      const messageBody = (content.body || "").replace(/\{\{first_name\}\}/g, leadName).replace(/\{\{full_name\}\}/g, lead.full_name || "");

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
            }),
          });
          const data = await res.json();
          deliveryStatus = data.success ? "delivered" : "failed";
          if (!data.success) sendError = data.error;
        } else if (effectiveChannel === "whatsapp" && lead.phone) {
          const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              workspaceId, phone: lead.phone, message: messageBody,
            }),
          });
          const data = await res.json();
          deliveryStatus = data.success ? "delivered" : "failed";
          if (!data.success) sendError = data.error;
        } else if (effectiveChannel === "sms" && lead.phone) {
          const res = await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              workspaceId, to: lead.phone, message: messageBody,
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

      // Insert campaign_message row
      await supabase.from("campaign_messages").insert({
        campaign_id, workspace_id: workspaceId, lead_id: lead.id,
        channel: channel === "multi-channel" ? "email" : channel,
        delivery_status: deliveryStatus,
      });

      if (deliveryStatus === "delivered") {
        sentCount++;
      } else {
        failedCount++;
      }

      results.push({ lead_id: lead.id, status: deliveryStatus, error: sendError });

      // Schedule fallback if enabled and primary failed/pending
      if (fallback?.enabled && deliveryStatus === "failed" && fallback.channel) {
        const runAt = new Date(Date.now() + (fallback.delay_minutes || 30) * 60 * 1000).toISOString();
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
