import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert marketing funnel architect for NexusFlo24. Given a user's business description or goal, generate a complete funnel structure with compelling page content.

Available step types: landing, optin, sales, checkout, upsell, thankyou.
Available objectives: lead_capture, webinar, product_sale, upsell, booking.

For each step, generate page_content as an array of blocks. Each block has a "type" and "props".
Supported block types and their props:
- heading: { text: string, level: "h1"|"h2"|"h3", align: "left"|"center"|"right" }
- text: { content: string, align: "left"|"center"|"right" }
- button: { label: string, url: string, variant: "primary"|"secondary"|"outline", align: "left"|"center"|"right" }
- image: { src: "", alt: string, width: "full"|"medium"|"small" }
- form: { fields: ["name","email","phone"], buttonText: string }
- divider: {}
- spacer: { height: "sm"|"md"|"lg" }

Generate compelling, conversion-focused copy. Use power words, clear value propositions, and strong CTAs.`;

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
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Create a complete marketing funnel for: ${prompt}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_funnel",
                description:
                  "Generate a complete marketing funnel structure with steps and page content",
                parameters: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Funnel name (short, descriptive)",
                    },
                    description: {
                      type: "string",
                      description: "Brief description of the funnel purpose",
                    },
                    objective: {
                      type: "string",
                      enum: [
                        "lead_capture",
                        "webinar",
                        "product_sale",
                        "upsell",
                        "booking",
                      ],
                    },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          step_type: {
                            type: "string",
                            enum: [
                              "landing",
                              "optin",
                              "sales",
                              "checkout",
                              "upsell",
                              "thankyou",
                            ],
                          },
                          page_content: {
                            type: "object",
                            properties: {
                              blocks: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    type: {
                                      type: "string",
                                      enum: [
                                        "heading",
                                        "text",
                                        "button",
                                        "image",
                                        "form",
                                        "divider",
                                        "spacer",
                                      ],
                                    },
                                    props: {
                                      type: "object",
                                      description:
                                        "Block properties. For 'heading': {text, level, align}. For 'text': {content, align}. For 'button': {label, url, variant, align}. For 'image': {src, alt, width}. For 'form': {fields, buttonText}. For 'divider': {}. For 'spacer': {height}. ALWAYS populate text/content/label with compelling marketing copy.",
                                    },
                                  },
                                  required: ["type", "props"],
                                  additionalProperties: false,
                                },
                              },
                            },
                            required: ["blocks"],
                            additionalProperties: false,
                          },
                        },
                        required: ["step_type", "page_content"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["name", "description", "objective", "steps"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_funnel" },
          },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI did not return a valid funnel structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const funnel = JSON.parse(toolCall.function.arguments);

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
