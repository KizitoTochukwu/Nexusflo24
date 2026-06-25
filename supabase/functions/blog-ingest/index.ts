// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "post";
}

function randomSuffix(n = 6) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("x-api-key") || "";
    if (!apiKey.startsWith("nfk_")) {
      return json({ error: "Missing or invalid x-api-key header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const keyHash = await sha256Hex(apiKey);
    const { data: keyRow, error: keyErr } = await supabase
      .rpc("verify_workspace_api_key", { _key_hash: keyHash })
      .maybeSingle();

    if (keyErr || !keyRow) return json({ error: "Invalid or revoked API key" }, 401);
    const scopes: string[] = keyRow.scopes || [];
    if (!scopes.includes("blog:write")) return json({ error: "API key missing blog:write scope" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    if (!title) return json({ error: "title is required" }, 400);
    if (!content) return json({ error: "content is required" }, 400);
    if (title.length > 300) return json({ error: "title too long (max 300)" }, 400);

    const status = body.status === "published" ? "published" : "draft";
    let slug = body.slug ? slugify(String(body.slug)) : slugify(title);

    // Ensure unique slug
    const { data: existing } = await supabase
      .from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${randomSuffix()}`;

    const insertPayload: Record<string, any> = {
      workspace_id: keyRow.workspace_id,
      title,
      slug,
      content,
      excerpt: body.excerpt ? String(body.excerpt).slice(0, 500) : null,
      image_url: body.image_url ? String(body.image_url).slice(0, 2000) : null,
      category: body.category ? String(body.category).slice(0, 80) : null,
      author: body.author ? String(body.author).slice(0, 120) : null,
      read_time: body.read_time ? String(body.read_time).slice(0, 30) : null,
      featured: Boolean(body.featured),
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    const { data: post, error: insErr } = await supabase
      .from("blog_posts").insert(insertPayload).select("id, slug, status").single();

    if (insErr) {
      console.error("blog_posts insert failed:", insErr);
      return json({ error: insErr.message }, 500);
    }

    // Mark key as used (fire-and-forget)
    supabase.from("workspace_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.key_id).then(() => {});

    const publicUrl = `https://nexusflo24.com/blog/${post.slug}`;
    return json({ success: true, id: post.id, slug: post.slug, status: post.status, public_url: publicUrl }, 201);
  } catch (e: any) {
    console.error("blog-ingest error:", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});
