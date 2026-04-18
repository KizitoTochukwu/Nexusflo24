import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id, workspace_id, score, notify_user_id } = await req.json();

    if (!lead_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing lead_id or workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, svcKey);

    // Load workspace prefs + lead details
    const [{ data: ws }, { data: lead }] = await Promise.all([
      admin
        .from("workspaces")
        .select("hot_lead_sms_enabled, hot_lead_whatsapp_enabled, hot_lead_notify_phone, owner_user_id")
        .eq("id", workspace_id)
        .single(),
      admin.from("leads").select("full_name, email, phone, score").eq("id", lead_id).single(),
    ]);

    if (!ws) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ws.hot_lead_sms_enabled && !ws.hot_lead_whatsapp_enabled) {
      return new Response(JSON.stringify({ skipped: "phone alerts disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which phone to alert: workspace override → assigned/owner profile phone
    let alertPhone: string | null = ws.hot_lead_notify_phone?.trim() || null;
    if (!alertPhone) {
      const targetUser = notify_user_id || ws.owner_user_id;
      if (targetUser) {
        const { data: profile } = await admin
          .from("profiles")
          .select("phone")
          .eq("id", targetUser)
          .single();
        alertPhone = profile?.phone?.trim() || null;
      }
    }

    if (!alertPhone) {
      return new Response(JSON.stringify({ skipped: "no notify phone on file" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadName = lead?.full_name || lead?.email || "A lead";
    const leadScore = score || lead?.score || 81;
    const message = `🔥 Hot Lead Alert: ${leadName} just scored ${leadScore}. Reach out now while they're warm! View in CRM: https://nexusflo24.com/dashboard/${workspace_id}/leads`;

    const results: Record<string, unknown> = {};

    // Send SMS
    if (ws.hot_lead_sms_enabled) {
      try {
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${svcKey}`,
          },
          body: JSON.stringify({
            workspaceId: workspace_id,
            to: alertPhone,
            message,
            skipCredits: true,
          }),
        });
        const smsData = await smsRes.json();
        results.sms = smsRes.ok ? { ok: true, id: smsData.providerMessageId } : { ok: false, error: smsData.error };
      } catch (e: any) {
        results.sms = { ok: false, error: e?.message || "send failed" };
      }
    }

    // Send WhatsApp
    if (ws.hot_lead_whatsapp_enabled) {
      try {
        const waRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${svcKey}`,
          },
          body: JSON.stringify({
            workspaceId: workspace_id,
            to: alertPhone,
            body: message,
            skipCredits: true,
          }),
        });
        const waData = await waRes.json();
        results.whatsapp = waRes.ok ? { ok: true, id: waData.waMessageId } : { ok: false, error: waData.error };
      } catch (e: any) {
        results.whatsapp = { ok: false, error: e?.message || "send failed" };
      }
    }

    return new Response(JSON.stringify({ ok: true, alertPhone, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-hot-lead error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
