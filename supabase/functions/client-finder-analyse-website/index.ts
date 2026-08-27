import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callNexusModel } from "../_shared/nexus-ai-core.ts";
import {
  adminClient,
  assertPublicHttpsUrl,
  cfCors,
  cfJson,
  fetchPublicPage,
  htmlToText,
  logUsage,
  parseModelJson,
  requireMember,
} from "../_shared/client-finder.ts";

const CANDIDATE_PATHS = ["/", "/about", "/about-us", "/services", "/pricing", "/what-we-do"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cfCors });

  const admin = adminClient();
  let body: { workspace_id?: string; offer_id?: string; website_url?: string };
  try {
    body = await req.json();
  } catch {
    return cfJson({ error: "Invalid JSON body" }, 400);
  }

  const workspaceId = body.workspace_id ?? "";
  const gate = await requireMember(req, admin, workspaceId);
  if (gate instanceof Response) return gate;

  let base: URL;
  try {
    base = assertPublicHttpsUrl(body.website_url ?? "");
  } catch (e) {
    return cfJson({ error: (e as Error).message }, 400);
  }

  if (body.offer_id) {
    await admin
      .from("prospecting_offers")
      .update({ website_analysis_status: "running" })
      .eq("id", body.offer_id)
      .eq("workspace_id", workspaceId);
  }

  // Retrieve a small, explicit set of public pages.
  const pages: Array<{ url: string; status: number; chars: number; retrieved_at: string }> = [];
  const chunks: string[] = [];
  for (const path of CANDIDATE_PATHS) {
    if (chunks.join(" ").length > 24_000) break;
    let target: URL;
    try {
      target = assertPublicHttpsUrl(new URL(path, base).toString());
    } catch {
      continue;
    }
    try {
      const page = await fetchPublicPage(target);
      const text = htmlToText(page.text);
      pages.push({
        url: page.url,
        status: page.status,
        chars: text.length,
        retrieved_at: new Date().toISOString(),
      });
      if (text.length > 200) chunks.push(`SOURCE: ${page.url}\n${text.slice(0, 6000)}`);
    } catch (e) {
      pages.push({ url: target.toString(), status: 0, chars: 0, retrieved_at: new Date().toISOString() });
      console.warn("page fetch failed", target.hostname, (e as Error).message);
    }
  }

  if (chunks.length === 0) {
    if (body.offer_id) {
      await admin
        .from("prospecting_offers")
        .update({
          website_analysis_status: "failed",
          website_analysis_pages: pages,
          website_analysed_at: new Date().toISOString(),
        })
        .eq("id", body.offer_id)
        .eq("workspace_id", workspaceId);
    }
    return cfJson(
      { error: "No readable public pages could be retrieved from that website.", pages },
      422,
    );
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return cfJson({ error: "AI is not configured for this project." }, 500);

  const { text, error } = await callNexusModel({
    apiKey,
    system:
      "You analyse a company's own public website copy to describe what they sell. Use ONLY the supplied page text. Never invent clients, metrics, awards or pricing. If something is not stated, leave the field empty. Reply with JSON only:\n" +
      `{"summary":"","value_proposition":"","customer_problem":"","key_benefits":[],"pricing_model":"","proof_points":"","suggested_industries":[],"suggested_job_titles":[]}`,
    messages: [{ role: "user", content: chunks.join("\n\n---\n\n").slice(0, 40_000) }],
    reasoning: "low",
  });

  if (error) {
    if (body.offer_id) {
      await admin
        .from("prospecting_offers")
        .update({ website_analysis_status: "failed", website_analysis_pages: pages })
        .eq("id", body.offer_id)
        .eq("workspace_id", workspaceId);
    }
    return cfJson({ error: error.message }, error.status);
  }

  const parsed = parseModelJson<Record<string, unknown>>(text);
  if (!parsed) return cfJson({ error: "The analysis could not be read. Please try again." }, 502);

  if (body.offer_id) {
    await admin
      .from("prospecting_offers")
      .update({
        website_analysis_status: "complete",
        website_analysis_summary: String(parsed.summary ?? ""),
        website_analysis_pages: pages,
        website_analysed_at: new Date().toISOString(),
      })
      .eq("id", body.offer_id)
      .eq("workspace_id", workspaceId);
  }

  await logUsage(admin, {
    workspace_id: workspaceId,
    user_id: gate.userId,
    operation: "website_analysis",
    provider: "lovable_ai",
    model: "openai/gpt-5.6-sol",
    related_table: "prospecting_offers",
    related_id: body.offer_id ?? null,
  });

  return cfJson({ analysis: parsed, pages });
});
