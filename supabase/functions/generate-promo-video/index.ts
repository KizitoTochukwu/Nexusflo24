// AI Promo Video: product photo + description -> short promo clip (ByteDance Seedance via Lovable AI Gateway).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "bytedance/seedance-2.5";
const BUCKET = "promo-videos";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    workspace_id: z.string().uuid(),
    image: z.string().startsWith("data:image/").max(8_000_000),
    mode: z.enum(["promo", "animate"]).default("promo"),
    product_name: z.string().trim().max(120).default(""),
    description: z.string().trim().max(1000).default(""),
    duration: z.union([z.literal(5), z.literal(10)]),
    resolution: z.enum(["480p", "720p"]),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]),
    generate_audio: z.boolean(),
  }),
  z.object({ action: z.literal("status"), workspace_id: z.string().uuid(), video_id: z.string().regex(/^[\w-]{1,128}$/) }),
  z.object({ action: z.literal("list"), workspace_id: z.string().uuid() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Please sign in." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims, error: authErr } = await admin.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (authErr || !userId) return json({ error: "Please sign in." }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    const { data: isAdmin } = await admin.rpc("is_workspace_admin", { _user_id: userId, _workspace_id: b.workspace_id });
    if (!isAdmin) return json({ error: "Only workspace admins can use AI Video Studio." }, 403);

    // One active video per workspace: an atomic lock file in storage (upload without upsert fails if it exists).
    const lockPath = `${b.workspace_id}/.lock.json`;
    const LOCK_TTL_MS = 10 * 60 * 1000;
    const clearLock = () => admin.storage.from(BUCKET).remove([lockPath]);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured yet." }, 503);
    const gwHeaders = { "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" };

    if (b.action === "list") {
      const { data: files } = await admin.storage.from(BUCKET).list(b.workspace_id, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
      const mp4s = (files ?? []).filter((f) => f.name.endsWith(".mp4"));
      const items = await Promise.all(mp4s.map(async (f) => {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(`${b.workspace_id}/${f.name}`, 3600);
        return { name: f.name, created_at: f.created_at, url: data?.signedUrl ?? null };
      }));
      return json({ items });
    }

    if (b.action === "create") {
      if (b.mode === "promo" && (!b.product_name || b.description.length < 5)) return json({ error: "Add a product name and short description." }, 400);
      const animate = b.mode === "animate";
      const prompt = animate
        ? `Bring this image to life as a short, natural video clip. Keep the scene, subjects, colours and composition faithful to the image. ${b.description || "Subtle natural motion and a gentle cinematic camera move."} ` + (b.generate_audio ? "Fitting ambient sound, no speech." : "")
        : `A polished commercial promo video for "${b.product_name}". The product from [Image1] is the hero of every shot and keeps its exact shape, colours, logo and packaging. ` +
        `${b.description} Smooth cinematic camera movement slowly orbiting and pushing in on the product, soft studio lighting with gentle reflections, clean premium background, shallow depth of field. ` +
        (b.generate_audio ? "Upbeat modern background music, no speech." : "");
      const takeLock = () => admin.storage.from(BUCKET).upload(lockPath, new Blob([JSON.stringify({ at: Date.now(), by: userId })], { type: "application/json" }), { upsert: false });
      let { error: lockErr } = await takeLock();
      if (lockErr) {
        const { data: f } = await admin.storage.from(BUCKET).download(lockPath);
        const at = f ? Number(JSON.parse(await f.text()).at) || 0 : 0;
        if (Date.now() - at < LOCK_TTL_MS) return json({ error: "A video is already generating for this workspace. Please wait for it to finish." }, 409);
        await clearLock();
        ({ error: lockErr } = await takeLock());
        if (lockErr) return json({ error: "A video is already generating for this workspace. Please wait for it to finish." }, 409);
      }
      const res = await fetch(`${GATEWAY}/videos`, {
        method: "POST",
        headers: { ...gwHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          input: {
            prompt,
            ...(animate ? { image: b.image } : { reference_images: [b.image] }),
            duration: b.duration,
            resolution: b.resolution,
            aspect_ratio: animate ? "adaptive" : b.aspect_ratio,
            generate_audio: b.generate_audio,
          },
        }),
      });
      const job = await res.json().catch(() => ({}));
      if (!res.ok) {
        await clearLock();
        const msg = job?.error?.message ?? job?.message ?? "Video generation could not start.";
        const friendly = res.status === 402 ? "Not enough AI credits to make this video." : res.status === 429 ? "Too many videos are being made right now. Please try again in a minute." : msg;
        return json({ error: friendly }, res.status);
      }
      return json({ video_id: job.id, status: job.status, progress: job.progress ?? 0 });
    }

    // status
    const path = `${b.workspace_id}/${b.video_id}.mp4`;
    const signed = async () => (await admin.storage.from(BUCKET).createSignedUrl(path, 3600)).data?.signedUrl ?? null;
    const existing = await signed();
    if (existing) return json({ status: "completed", progress: 100, url: existing });

    const res = await fetch(`${GATEWAY}/videos/${b.video_id}`, { headers: gwHeaders });
    const job = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: job?.error?.message ?? "Could not check video status." }, res.status);
    if (job.status === "failed") {
      await clearLock();
      const code = job.error?.code;
      const hint = code === "moderation_blocked" || code === "invalid_request" ? " The product photo may be the cause — try a different photo." : "";
      return json({ status: "failed", error: (job.error?.message ?? "Video generation failed.") + hint });
    }
    if (job.status !== "completed") return json({ status: job.status, progress: job.progress ?? 0 });

    const content = await fetch(`${GATEWAY}/videos/${b.video_id}/content`, { headers: gwHeaders });
    if (!content.ok) return json({ error: "Video finished but could not be downloaded. Please check again." }, 502);
    const bytes = new Uint8Array(await content.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "video/mp4", upsert: true });
    await clearLock();
    if (upErr) return json({ error: "Could not save the video." }, 500);
    return json({ status: "completed", progress: 100, url: await signed() });
  } catch (e) {
    console.error("generate-promo-video error", e);
    return json({ error: "Something went wrong." }, 500);
  }
});
