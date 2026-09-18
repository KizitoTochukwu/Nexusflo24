/**
 * NexusFlo Voice — knowledge processing.
 *
 * Turns a knowledge source (typed answer, approved URL or uploaded document)
 * into searchable chunks. Keyword retrieval only for now; semantic search
 * arrives when the vector extension is available.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "you", "your", "our", "with", "that", "this", "from", "have",
  "has", "was", "were", "will", "can", "but", "not", "all", "any", "how", "what", "when",
  "who", "why", "they", "their", "there", "here", "into", "about", "over", "under",
]);

const MAX_CHARS = 1200;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    const para = p.trim();
    if (!para) continue;
    if (para.length > MAX_CHARS) {
      if (current) { chunks.push(current); current = ""; }
      for (const sentence of para.match(/[^.!?]+[.!?]*/g) ?? [para]) {
        if ((current + " " + sentence).trim().length > MAX_CHARS) {
          if (current) chunks.push(current.trim());
          current = sentence;
        } else {
          current = `${current} ${sentence}`.trim();
        }
      }
      continue;
    }
    if ((current + "\n\n" + para).trim().length > MAX_CHARS) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function keywordsFor(text: string): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z0-9'’-]{3,}/g) ?? []) {
    const word = raw.replace(/['’-]+$/, "");
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const READABLE_DOCS = /\.(txt|md|markdown|csv|json|html?|vtt)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json().catch(() => ({}));
    const sourceId = typeof body.source_id === "string" ? body.source_id : "";
    if (!sourceId) return json({ error: "source_id is required" }, 400);

    const { data: source, error: loadError } = await admin
      .from("voice_knowledge_sources")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!source) return json({ error: "Knowledge source not found" }, 404);

    const denied = await requireInternalOrWorkspaceMember(req, admin, source.workspace_id);
    if (denied) return denied;

    await admin.from("voice_knowledge_sources").update({ status: "processing", error_message: null }).eq("id", sourceId);

    const fail = async (message: string) => {
      await admin
        .from("voice_knowledge_sources")
        .update({ status: "failed", error_message: message })
        .eq("id", sourceId);
      return json({ ok: false, status: "failed", error: message });
    };

    let text = "";

    if (source.source_type === "url") {
      const url = String(source.url ?? "").trim();
      if (!/^https?:\/\//i.test(url)) return await fail("Add a full web address that starts with http:// or https://");
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "NexusFlo24-Voice/1.0 (+https://nexusflo24.com)" },
          redirect: "follow",
        });
        if (!res.ok) return await fail(`That page could not be read (it replied ${res.status}).`);
        const raw = await res.text();
        text = htmlToText(raw);
      } catch (_e) {
        return await fail("That page could not be reached. Check the address and try again.");
      }
      if (text.length < 40) return await fail("That page had no readable text to learn from.");
    } else if (source.source_type === "document") {
      const path = String(source.storage_path ?? "");
      if (!path) return await fail("The uploaded file is missing. Upload it again.");
      if (!READABLE_DOCS.test(path)) {
        return await fail(
          "This file type cannot be read yet. Upload a plain text, Markdown or CSV file, or paste the wording in directly.",
        );
      }
      const { data: file, error: dlError } = await admin.storage.from("voice-knowledge").download(path);
      if (dlError || !file) return await fail("The uploaded file could not be opened. Upload it again.");
      const raw = await file.text();
      text = /\.html?$/i.test(path) ? htmlToText(raw) : raw;
      if (text.trim().length < 20) return await fail("That file had no readable text in it.");
    } else {
      text = String(source.content ?? "");
      if (text.trim().length < 2) return await fail("Add the wording this answer should use.");
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) return await fail("There was no readable text to learn from.");

    await admin.from("voice_knowledge_chunks").delete().eq("source_id", sourceId);
    const { error: insertError } = await admin.from("voice_knowledge_chunks").insert(
      chunks.map((content, index) => ({
        workspace_id: source.workspace_id,
        source_id: sourceId,
        chunk_index: index,
        content,
        keywords: keywordsFor(`${source.title} ${content}`),
      })),
    );
    if (insertError) throw insertError;

    const extracted = source.source_type === "url" || source.source_type === "document"
      ? text.slice(0, 20000)
      : source.content;

    await admin
      .from("voice_knowledge_sources")
      .update({ status: "ready", error_message: null, content: extracted })
      .eq("id", sourceId);

    return json({ ok: true, status: "ready", chunks: chunks.length });
  } catch (e) {
    console.error("[voice-knowledge-process]", e);
    return json({ error: (e as Error).message ?? "Processing failed" }, 500);
  }
});
