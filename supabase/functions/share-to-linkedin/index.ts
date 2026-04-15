import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, excerpt, url, image_url } = await req.json();

    if (!title || !url) {
      return new Response(JSON.stringify({ error: "title and url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const personUrn = Deno.env.get("LINKEDIN_PERSON_URN");

    if (!accessToken || !personUrn) {
      return new Response(JSON.stringify({ error: "LinkedIn credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build LinkedIn share payload
    const sharePayload: Record<string, unknown> = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: `${title}\n\n${excerpt || ""}`.trim(),
          },
          shareMediaCategory: url ? "ARTICLE" : "NONE",
          media: [
            {
              status: "READY",
              originalUrl: url,
              ...(image_url ? { description: { text: excerpt || title } } : {}),
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const linkedinRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(sharePayload),
    });

    if (!linkedinRes.ok) {
      const errBody = await linkedinRes.text();
      console.error("LinkedIn API error:", linkedinRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `LinkedIn API error [${linkedinRes.status}]`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await linkedinRes.json();
    console.log("LinkedIn post shared successfully:", result.id);

    return new Response(JSON.stringify({ success: true, linkedin_post_id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("share-to-linkedin error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
