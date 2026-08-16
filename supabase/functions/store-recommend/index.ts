// AI recommendation engine for the Automation Store.
// Given a shopper's answers (or a free-text description), it picks the best-fitting
// published products and explains, in plain English, why each one fits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  mode?: "finder" | "scope";
  goal?: string;
  problems?: string[];
  industry?: string;
  budget?: string;
  description?: string;
  currentProcess?: string;
  desiredProcess?: string;
  platforms?: string;
  volume?: string;
  timeline?: string;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const mode = body.mode ?? "finder";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: products } = await supabase
      .from("store_products")
      .select(
        "slug,name,level,outcome,summary,category_slug,problem_slugs,industries,integrations,base_price_pence,delivery_estimate,is_popular",
      )
      .eq("is_published", true)
      .order("position");

    const catalogue = (products ?? []).map((p: any) => ({
      slug: p.slug,
      name: p.name,
      level: p.level,
      outcome: p.outcome,
      summary: p.summary,
      category: p.category_slug,
      problems: p.problem_slugs,
      industries: p.industries,
      integrations: p.integrations,
      price_gbp: Math.round((p.base_price_pence ?? 0) / 100),
      delivery: p.delivery_estimate,
      popular: p.is_popular,
    }));

    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured yet." }, 503);

    const shopper =
      mode === "scope"
        ? [
            `Business description: ${body.description ?? "—"}`,
            `Industry: ${body.industry ?? "—"}`,
            `How things work today: ${body.currentProcess ?? "—"}`,
            `How they want it to work: ${body.desiredProcess ?? "—"}`,
            `Platforms in use: ${body.platforms ?? "—"}`,
            `Monthly volume: ${body.volume ?? "—"}`,
            `Timeline: ${body.timeline ?? "—"}`,
            `Budget: ${body.budget ?? "—"}`,
          ].join("\n")
        : [
            `Main goal: ${body.goal ?? "—"}`,
            `Problems recognised: ${(body.problems ?? []).join(", ") || "—"}`,
            `Industry: ${body.industry ?? "—"}`,
            `Setup budget: ${body.budget ?? "—"}`,
            body.description ? `In their words: ${body.description}` : "",
          ]
            .filter(Boolean)
            .join("\n");

    const system = `You advise small business owners on which done-for-you automation to buy from the NexusFlo24 Automation Store.
Rules:
- Only recommend automations from the supplied catalogue, by exact slug.
- Recommend 1 to 3, ordered best-fit first. If nothing genuinely fits, return an empty list.
- Write in plain British English, outcome-led, no technical jargon and no invented statistics.
- Never promise a final price; the listed price is a starting point confirmed in writing before payment.
- "summary" is 1-2 sentences describing what you understood about their business.
- Each "reason" is one short sentence explaining why that automation fits THEM specifically.
${mode === "scope" ? '- Also return "scope": 3-6 short bullet points describing the workflow we would build for them.' : ""}
Return JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `CATALOGUE:\n${JSON.stringify(catalogue)}\n\nBUSINESS:\n${shopper}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "recommendations", "scope"],
              properties: {
                summary: { type: "string" },
                scope: { type: "array", items: { type: "string" } },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["slug", "reason"],
                    properties: {
                      slug: { type: "string" },
                      reason: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (response.status === 429) return json({ error: "Too many requests. Please try again shortly." }, 429);
    if (response.status === 402) return json({ error: "AI credits are exhausted. Please top up." }, 402);
    if (!response.ok) {
      const text = await response.text();
      console.error("[store-recommend] gateway error", response.status, text);
      return json({ error: "The recommendation engine is unavailable right now." }, 502);
    }

    const payload = await response.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const valid = new Set(catalogue.map((c) => c.slug));
    const recommendations = (parsed.recommendations ?? [])
      .filter((r: any) => r?.slug && valid.has(r.slug))
      .slice(0, 3);

    return json({
      summary: parsed.summary ?? "",
      scope: Array.isArray(parsed.scope) ? parsed.scope.slice(0, 6) : [],
      recommendations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[store-recommend] error:", message);
    return json({ error: message }, 500);
  }
});
