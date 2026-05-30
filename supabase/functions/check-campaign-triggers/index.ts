import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalCaller } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

/**
 * Reusable edge function to check and fire triggered campaigns.
 * Called by DB triggers (via pg_net) or other edge functions when events occur.
 *
 * Body: { workspace_id, lead_id, trigger_type, trigger_value? }
 *   trigger_type: "tag_added" | "tag_removed" | "score_threshold"
 *   trigger_value: the specific tag name or score value (optional filtering)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const guard = requireInternalCaller(req);
  if (guard) return guard;

  try {
    const { workspace_id, lead_id, trigger_type, trigger_value } = await req.json();

    if (!workspace_id || !lead_id || !trigger_type) {
      return new Response(
        JSON.stringify({ error: "workspace_id, lead_id, and trigger_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find active triggered campaigns matching this trigger type
    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("id, trigger_config")
      .eq("workspace_id", workspace_id)
      .eq("campaign_mode", "triggered")
      .eq("status", "active")
      .contains("trigger_config", { type: trigger_type });

    if (campErr) {
      console.error("Error fetching triggered campaigns:", campErr);
      return new Response(
        JSON.stringify({ error: campErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, fired: 0, message: "No matching triggered campaigns" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filter campaigns by trigger_value if the campaign specifies one
    const matchingCampaigns = campaigns.filter((camp) => {
      const config = camp.trigger_config as Record<string, any> | null;
      if (!config?.value) return true; // No value filter = matches all
      if (!trigger_value) return true; // No specific value provided = matches all

      // For score_threshold, check if the new score meets the threshold
      if (trigger_type === "score_threshold") {
        return Number(trigger_value) >= Number(config.value);
      }

      // For tag triggers, check if the tag matches
      return config.value === trigger_value;
    });

    let fired = 0;
    for (const camp of matchingCampaigns) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/execute-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ campaign_id: camp.id, lead_ids: [lead_id] }),
        });
        fired++;
      } catch (err) {
        console.error(`Failed to fire campaign ${camp.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, fired, total_matched: matchingCampaigns.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("check-campaign-triggers error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
