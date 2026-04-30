import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-trigger",
};

const PUBLIC_SITE = "https://nexusflo24.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const isInternal = req.headers.get("x-internal-trigger") === "blog-publish";

    // Auth: either internal trigger (service role bearer) or authenticated user
    if (!isInternal) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve post details
    let title: string | undefined = body.title;
    let excerpt: string | undefined = body.excerpt;
    let url: string | undefined = body.url;
    let image_url: string | null | undefined = body.image_url;
    let postId: string | undefined = body.post_id;

    if (postId) {
      const { data: post, error } = await adminClient
        .from("blog_posts")
        .select("id, title, slug, excerpt, image_url, status, linkedin_shared_at")
        .eq("id", postId)
        .maybeSingle();
      if (error || !post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (post.status !== "published") {
        return new Response(JSON.stringify({ error: "Post is not published" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (post.linkedin_shared_at && isInternal) {
        // Internal trigger guard — never repost
        return new Response(JSON.stringify({ skipped: true, reason: "already shared" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      title = post.title;
      excerpt = post.excerpt;
      image_url = post.image_url;
      url = `${PUBLIC_SITE}/blog/${post.slug}`;
    }

    if (!title || !url) {
      return new Response(JSON.stringify({ error: "title and url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const authorUrn = Deno.env.get("LINKEDIN_PERSON_URN");

    if (!accessToken || !authorUrn) {
      const msg = "LinkedIn credentials not configured";
      if (postId) {
        await adminClient.from("blog_posts").update({ linkedin_share_error: msg }).eq("id", postId);
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isReshare = !isInternal && body.reshare === true;
    const uniqueSuffix = isReshare ? `\n\n#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}` : "";

    const postBody: Record<string, unknown> = {
      author: authorUrn,
      commentary: `${title}\n\n${excerpt || ""}\n\nRead more: ${url}${uniqueSuffix}`.trim(),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
      content: {
        article: {
          source: url,
          title: title,
          description: excerpt || title,
        },
      },
    };

    console.log("Posting to LinkedIn with author:", authorUrn, "url:", url);

    const linkedinRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202506",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!linkedinRes.ok) {
      const errBody = await linkedinRes.text();
      console.error("LinkedIn API error:", linkedinRes.status, errBody);

      const isDuplicate = linkedinRes.status === 422 && /DUPLICATE_POST|duplicate/i.test(errBody);
      if (isDuplicate) {
        const dupMatch = errBody.match(/urn:li:share:\d+/);
        const dupId = dupMatch ? dupMatch[0] : "duplicate";
        if (postId) {
          await adminClient
            .from("blog_posts")
            .update({
              linkedin_shared_at: new Date().toISOString(),
              linkedin_post_id: dupId,
              linkedin_share_error: null,
            })
            .eq("id", postId);
        }
        return new Response(
          JSON.stringify({ success: true, linkedin_post_id: dupId, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errMsg = `LinkedIn API error [${linkedinRes.status}]: ${errBody.slice(0, 500)}`;
      if (postId) {
        await adminClient.from("blog_posts").update({ linkedin_share_error: errMsg }).eq("id", postId);
      }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkedinPostId = linkedinRes.headers.get("x-restli-id") || "unknown";
    await linkedinRes.text();
    console.log("LinkedIn post shared:", linkedinPostId);

    if (postId) {
      await adminClient
        .from("blog_posts")
        .update({
          linkedin_shared_at: new Date().toISOString(),
          linkedin_post_id: linkedinPostId,
          linkedin_share_error: null,
        })
        .eq("id", postId);
    }

    return new Response(JSON.stringify({ success: true, linkedin_post_id: linkedinPostId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("share-to-linkedin error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
