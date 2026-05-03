import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VALID_EVENTS = new Set([
  "website_visit", "pricing_page_visit", "lead_magnet_download",
  "webinar_registration", "call_booking", "purchase", "checkout_visit",
]);

// Embeddable tracking script served via GET
const TRACKING_SCRIPT = (baseUrl: string, wid: string) => `
(function(){
  var wid="${wid}";
  var base="${baseUrl}/functions/v1/track-event";
  function getCookie(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?m[2]:null;}
  function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+"="+v+";expires="+e.toUTCString()+";path=/;SameSite=Lax";}
  var lid=getCookie("nf_lid")||"";
  var email=getCookie("nf_email")||"";
  function track(eventType,meta){
    var body={workspace_id:wid,event_type:eventType,meta:meta||{}};
    if(lid)body.lid=lid;
    if(email)body.email=email;
    try{navigator.sendBeacon(base,JSON.stringify(body));}catch(e){
      fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true});
    }
  }
  var page=location.pathname;
  var eventType="website_visit";
  if(page.includes("pricing")||page.includes("plans"))eventType="pricing_page_visit";
  track(eventType,{url:location.href,referrer:document.referrer,title:document.title});
  window.__nfTrack=track;
  window.__nfIdentify=function(e,l){
    if(e){email=e;setCookie("nf_email",e,365);}
    if(l){lid=l;setCookie("nf_lid",l,365);}
  };
})();
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Serve embeddable JS snippet
  if (req.method === "GET" && url.searchParams.get("embed") === "1") {
    const wid = url.searchParams.get("wid") || "";
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    return new Response(TRACKING_SCRIPT(baseUrl, wid), {
      headers: { ...corsHeaders, "Content-Type": "application/javascript", "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const body = await req.json();
    const { email, lid, workspace_id, event_type, meta } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!event_type || !VALID_EVENTS.has(event_type)) {
      return new Response(JSON.stringify({ error: "Invalid event_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve lead
    let leadId = lid || null;
    let leadUserId: string | null = null;

    if (!leadId && email) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, user_id")
        .eq("workspace_id", workspace_id)
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (lead) {
        leadId = lead.id;
        leadUserId = lead.user_id;
      }
    }

    if (leadId && !leadUserId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("user_id")
        .eq("id", leadId)
        .eq("workspace_id", workspace_id)
        .maybeSingle();
      if (lead) leadUserId = lead.user_id;
    }

    // If we can't identify a lead, get workspace owner as fallback
    if (!leadUserId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspace_id)
        .maybeSingle();
      if (ws) leadUserId = ws.owner_user_id;
    }

    if (!leadUserId) {
      return new Response(JSON.stringify({ ok: false, reason: "no_owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only log activity if we have a lead
    if (leadId) {
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        workspace_id,
        user_id: leadUserId,
        type: event_type,
        meta: meta || {},
      });

      // Check for matching automations
      const triggerMap: Record<string, string> = {
        website_visit: "website_visit",
        pricing_page_visit: "pricing_page_visit",
        lead_magnet_download: "lead_magnet_download",
        webinar_registration: "webinar_registration",
        call_booking: "call_booking",
        purchase: "purchase_event",
      };

      const triggerType = triggerMap[event_type];
      if (triggerType) {
        const { data: automations } = await supabase
          .from("automations")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("trigger_type", triggerType)
          .eq("status", "active");

        if (automations && automations.length > 0) {
          const execUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-automation`;
          for (const auto of automations) {
            try {
              await fetch(execUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ automation_id: auto.id, lead_id: leadId, workspace_id }),
              });
            } catch (e) {
              console.error(`Failed to execute automation ${auto.id}:`, e);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, leadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("track-event error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
