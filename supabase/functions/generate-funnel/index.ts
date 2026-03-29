import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert marketing funnel architect for NexusFlo24.
Given a user's business description or goal, generate a complete funnel structure as JSON.

RESPOND WITH ONLY VALID JSON — no markdown, no code fences, no explanation.

The JSON must follow this exact schema:
{
  "name": "short funnel name",
  "description": "one-sentence purpose",
  "objective": "lead_capture" | "webinar" | "product_sale" | "upsell" | "booking",
  "steps": [
    {
      "step_type": "landing" | "optin" | "sales" | "checkout" | "upsell" | "thankyou",
      "page_content": {
        "blocks": [
          { "type": "heading", "props": { "text": "...", "level": "h1", "align": "center" } },
          { "type": "text", "props": { "content": "...", "align": "center" } },
          { "type": "button", "props": { "label": "...", "url": "#", "variant": "primary", "align": "center" } },
          { "type": "image", "props": { "src": "", "alt": "...", "width": "full" } },
          { "type": "form", "props": { "fields": ["name","email"], "buttonText": "..." } },
          { "type": "divider", "props": {} },
          { "type": "spacer", "props": { "height": "md" } }
        ]
      }
    }
  ]
}

CRITICAL RULES:
- Every heading block MUST have "text" with compelling marketing copy
- Every text block MUST have "content" with persuasive body copy
- Every button block MUST have "label" with an action-oriented CTA
- Every form block MUST have "fields" array and "buttonText"
- Generate at least 3 steps (typically: landing, optin, thankyou)
- Use power words, clear value propositions, and strong CTAs
- Each step should have 5-8 blocks minimum
- DO NOT return empty props — every block must have meaningful content`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "A prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Create a complete marketing funnel for: ${prompt}` },
          ],
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error("No content in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI did not return a valid funnel structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Strip markdown code fences if present
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let funnel;
    try {
      funnel = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON:", jsonStr);
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate minimal structure
    if (!funnel.name || !funnel.steps || !Array.isArray(funnel.steps)) {
      console.error("Invalid funnel structure:", JSON.stringify(funnel));
      return new Response(
        JSON.stringify({ error: "AI returned incomplete funnel. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ funnel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-funnel error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
