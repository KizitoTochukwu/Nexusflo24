import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const lid = url.searchParams.get("lid");
  const wid = url.searchParams.get("wid");
  const cid = url.searchParams.get("cid");
  const targetUrl = url.searchParams.get("url");

  // Always redirect even if tracking fails
  const redirectTo = targetUrl || "https://nexusflo24.lovable.app";

  try {
    if (lid && wid) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: lead } = await supabase
        .from("leads")
        .select("user_id")
        .eq("id", lid)
        .eq("workspace_id", wid)
        .maybeSingle();

      if (lead) {
        // Log link_click activity
        await supabase.from("lead_activities").insert({
          lead_id: lid,
          workspace_id: wid,
          user_id: lead.user_id,
          type: "link_click",
          meta: { url: targetUrl, campaign_id: cid || null, tracked_at: new Date().toISOString() },
        });

        // Update campaign_messages if campaign ID provided
        if (cid) {
          await supabase
            .from("campaign_messages")
            .update({ clicked: true })
            .eq("campaign_id", cid)
            .eq("lead_id", lid)
            .eq("workspace_id", wid);
        }

        // Fire triggered campaigns with link_clicked trigger
        try {
          const { data: triggeredCampaigns } = await supabase
            .from("campaigns")
            .select("id")
            .eq("workspace_id", wid)
            .eq("campaign_mode", "triggered")
            .eq("status", "active")
            .contains("trigger_config", { type: "link_clicked" });

          for (const camp of triggeredCampaigns || []) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-campaign`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ campaign_id: camp.id, lead_ids: [lid] }),
            });
          }
        } catch (triggerErr) {
          console.error("track-click trigger check error:", triggerErr);
        }

        // Fire score_threshold triggered campaigns
        try {
          const { data: updatedLead } = await supabase
            .from("leads")
            .select("score")
            .eq("id", lid)
            .single();

          if (updatedLead?.score) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-campaign-triggers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                workspace_id: wid, lead_id: lid,
                trigger_type: "score_threshold", trigger_value: String(updatedLead.score),
              }),
            });
          }
        } catch (scoreErr) {
          console.error("track-click score trigger error:", scoreErr);
        }
      }
    }
  } catch (err) {
    console.error("track-click error:", err);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  });
});
