import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert lead-capture form designer for NexusFlo24.
Given a business description, generate a complete form definition as JSON.

RESPOND WITH ONLY VALID JSON — no markdown, no code fences, no explanation.

Schema:
{
  "name": "short form name",
  "description": "one-sentence purpose",
  "submit_text": "call-to-action for the submit button",
  "success_message": "short friendly thank-you message",
  "steps": [
    {
      "title": "optional step title",
      "fields": [
        {
          "type": "short_text" | "long_text" | "email" | "phone" | "number" | "select" | "checkbox" | "checkbox_group" | "radio" | "consent" | "date" | "file" | "heading" | "paragraph",
          "label": "visible label",
          "name": "snake_case_key",
          "placeholder": "optional",
          "help_text": "optional",
          "required": true,
          "options": [{ "label": "Option", "value": "option" }]
        }
      ]
    }
  ]
}

RULES:
- Always include exactly one field with type "email" and name "email".
- Use name "full_name" for the person's name and "phone" for a phone number.
- "options" is REQUIRED for select, radio and checkbox_group fields (2-6 options each).
- Keep it short: 4-8 input fields total unless the user asks for more.
- Only produce multiple steps when the user asks for a multi-step form; otherwise one step.
- Labels and placeholders must be real, specific copy — never lorem ipsum or placeholders like "Field 1".
- Do not invent field types outside the list above.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, multi_step } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please describe the form you want" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userMsg = `Create a lead capture form for: ${prompt.trim()}\n\n${
      multi_step
        ? "Split the fields across 2-3 logical steps."
        : "Use a single step."
    }\n\nRespond with ONLY the JSON object.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits are exhausted. Add credits to keep generating." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 403) {
        return new Response(
          JSON.stringify({ error: "AI is currently disabled for this workspace." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error("No content in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return a form. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let jsonStr = String(rawContent).trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let form: any;
    try {
      form = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI JSON:", jsonStr);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!form?.name || !Array.isArray(form?.steps) || form.steps.length === 0) {
      console.error("Invalid form structure:", JSON.stringify(form));
      return new Response(JSON.stringify({ error: "AI returned an incomplete form. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ form }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-form error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
