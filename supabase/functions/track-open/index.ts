import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const lid = url.searchParams.get("lid");
    const wid = url.searchParams.get("wid");
    const cid = url.searchParams.get("cid");

    if (lid && wid) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Get lead owner for activity logging
      const { data: lead } = await supabase
        .from("leads")
        .select("user_id")
        .eq("id", lid)
        .eq("workspace_id", wid)
        .maybeSingle();

      if (lead) {
        // Log email_open activity
        await supabase.from("lead_activities").insert({
          lead_id: lid,
          workspace_id: wid,
          user_id: lead.user_id,
          type: "email_open",
          meta: { campaign_id: cid || null, tracked_at: new Date().toISOString() },
        });

        // Update campaign_messages if campaign ID provided
        if (cid) {
          await supabase
            .from("campaign_messages")
            .update({ opened: true })
            .eq("campaign_id", cid)
            .eq("lead_id", lid)
            .eq("workspace_id", wid);
        }

        // Fire triggered campaigns with email_opened trigger
        try {
          const { data: triggeredCampaigns } = await supabase
            .from("campaigns")
            .select("id")
            .eq("workspace_id", wid)
            .eq("campaign_mode", "triggered")
            .eq("status", "active")
            .contains("trigger_config", { type: "email_opened" });

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
          console.error("track-open trigger check error:", triggerErr);
        }
      }
    }
  } catch (err) {
    console.error("track-open error:", err);
  }

  // Always return the pixel regardless of errors
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
