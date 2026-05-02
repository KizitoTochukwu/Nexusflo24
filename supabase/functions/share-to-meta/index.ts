import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-trigger",
};

const PUBLIC_SITE = "https://nexusflo24.com";
const GRAPH = "https://graph.facebook.com/v21.0";

function buildCaption(title: string, excerpt: string | null | undefined, url: string, reshare: boolean) {
  const suffix = reshare ? `\n\n#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}` : "";
  return `${title}\n\n${excerpt || ""}\n\nRead more: ${url}${suffix}`.trim();
}

async function shareFacebook(pageId: string, token: string, caption: string, url: string, imageUrl: string | null) {
  // Use a link post; FB will pull OG image. If image_url present, prefer photo post with link in caption.
  if (imageUrl) {
    const res = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        caption: `${caption}`,
        access_token: token,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`FB photo error [${res.status}]: ${JSON.stringify(json).slice(0, 500)}`);
    return json.post_id || json.id;
  }
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: caption, link: url, access_token: token }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`FB feed error [${res.status}]: ${JSON.stringify(json).slice(0, 500)}`);
  return json.id;
}

async function shareInstagram(igUserId: string, token: string, caption: string, imageUrl: string) {
  // 1) Create container
  const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok) throw new Error(`IG create error [${createRes.status}]: ${JSON.stringify(createJson).slice(0, 500)}`);
  const creationId = createJson.id;

  // 2) Publish
  const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  const pubJson = await pubRes.json();
  if (!pubRes.ok) throw new Error(`IG publish error [${pubRes.status}]: ${JSON.stringify(pubJson).slice(0, 500)}`);
  return pubJson.id;
}

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

    const postId: string | undefined = body.post_id;
    const reshare: boolean = !isInternal && body.reshare === true;
    const channels: string[] = Array.isArray(body.channels) && body.channels.length
      ? body.channels
      : ["facebook", "instagram"];

    if (!postId) {
      return new Response(JSON.stringify({ error: "post_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post, error } = await adminClient
      .from("blog_posts")
      .select("id, title, slug, excerpt, image_url, status, facebook_shared_at, instagram_shared_at")
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

    const accessToken = Deno.env.get("META_PAGE_ACCESS_TOKEN");
    const pageId = Deno.env.get("META_FACEBOOK_PAGE_ID");
    const igUserId = Deno.env.get("META_INSTAGRAM_BUSINESS_ACCOUNT_ID");

    if (!accessToken || !pageId || !igUserId) {
      const msg = "Meta credentials not configured";
      await adminClient.from("blog_posts").update({
        facebook_share_error: msg,
        instagram_share_error: msg,
      }).eq("id", postId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${PUBLIC_SITE}/blog/${post.slug}`;
    const caption = buildCaption(post.title, post.excerpt, url, reshare);

    const updates: Record<string, unknown> = {};
    const result: Record<string, unknown> = {};

    // Facebook
    if (channels.includes("facebook") && (reshare || !post.facebook_shared_at)) {
      try {
        const fbId = await shareFacebook(pageId, accessToken, caption, url, post.image_url);
        updates.facebook_post_id = fbId;
        updates.facebook_shared_at = new Date().toISOString();
        updates.facebook_share_error = null;
        result.facebook = { success: true, post_id: fbId };
      } catch (e) {
        const msg = (e as Error).message;
        console.error("FB share failed:", msg);
        updates.facebook_share_error = msg;
        result.facebook = { success: false, error: msg };
      }
    }

    // Instagram (requires image)
    if (channels.includes("instagram") && (reshare || !post.instagram_shared_at)) {
      if (!post.image_url) {
        const msg = "Instagram requires an image_url on the post";
        updates.instagram_share_error = msg;
        result.instagram = { success: false, error: msg };
      } else {
        try {
          const igId = await shareInstagram(igUserId, accessToken, caption, post.image_url);
          updates.instagram_post_id = igId;
          updates.instagram_shared_at = new Date().toISOString();
          updates.instagram_share_error = null;
          result.instagram = { success: true, post_id: igId };
        } catch (e) {
          const msg = (e as Error).message;
          console.error("IG share failed:", msg);
          updates.instagram_share_error = msg;
          result.instagram = { success: false, error: msg };
        }
      }
    }

    if (Object.keys(updates).length) {
      await adminClient.from("blog_posts").update(updates).eq("id", postId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("share-to-meta error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
