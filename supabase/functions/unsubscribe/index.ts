import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let leadId: string | null = null;
    let workspaceId: string | null = null;

    if (req.method === "POST") {
      const body = await req.json();
      leadId = body.lid;
      workspaceId = body.wid;
    } else {
      const url = new URL(req.url);
      leadId = url.searchParams.get("lid");
      workspaceId = url.searchParams.get("wid");
    }

    if (!leadId || !workspaceId) {
      return new Response(JSON.stringify({ status: "invalid", message: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, tags, full_name, email")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !lead) {
      return new Response(JSON.stringify({ status: "not_found", message: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingTags: string[] = lead.tags || [];
    if (existingTags.includes("unsubscribed")) {
      return new Response(JSON.stringify({ status: "already_unsubscribed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("leads")
      .update({ tags: [...existingTags, "unsubscribed"] })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      workspace_id: workspaceId,
      user_id: "00000000-0000-0000-0000-000000000000",
      type: "email_unsubscribe",
      meta: { source: "email_footer" },
    });

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("unsubscribe error:", err);
    return new Response(JSON.stringify({ status: "error", message: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
