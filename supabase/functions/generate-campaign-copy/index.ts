import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { channel, objective, tone, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert marketing copywriter. Generate campaign copy for a ${channel} campaign.

Rules:
- Tone: ${tone || "professional"}
- Objective: ${objective || "promotion"}
- Channel: ${channel || "email"}
- For email: generate subject line, body with HTML-safe text, and a clear CTA
- For WhatsApp: keep it concise, conversational, use emojis sparingly
- For SMS: max 160 characters, punchy and action-oriented
- Generate 2 variants so the user can choose

Respond with valid JSON using this exact structure:
{
  "variants": [
    { "subject": "...", "body": "...", "cta": "..." },
    { "subject": "...", "body": "...", "cta": "..." }
  ]
}`;

    const userPrompt = context
      ? `Generate campaign copy for: ${context}`
      : `Generate a ${tone || "professional"} ${objective || "promotional"} ${channel || "email"} campaign message.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_copy",
              description: "Return campaign copy variants",
              parameters: {
                type: "object",
                properties: {
                  variants: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string", description: "Subject line or headline" },
                        body: { type: "string", description: "Message body" },
                        cta: { type: "string", description: "Call to action text" },
                      },
                      required: ["subject", "body", "cta"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["variants"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_copy" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let variants;

    if (toolCall?.function?.arguments) {
      variants = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      variants = jsonMatch ? JSON.parse(jsonMatch[0]) : { variants: [] };
    }

    return new Response(JSON.stringify(variants), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign-copy error:", e);
    return new Response(JSON.stringify({ error: "Failed to generate campaign copy. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
