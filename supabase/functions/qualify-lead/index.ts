import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { lead_id, workspace_id } = await req.json();
    if (!lead_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "lead_id and workspace_id required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id)
      .single();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: corsHeaders });
    }

    // Fetch last 50 activities
    const { data: activities } = await supabase
      .from("lead_activities")
      .select("type, meta, created_at")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Build engagement summary for LLM
    const now = new Date();
    const createdDaysAgo = Math.round((now.getTime() - new Date(lead.created_at).getTime()) / 86400000);
    const lastActivityDaysAgo = lead.last_activity_at
      ? Math.round((now.getTime() - new Date(lead.last_activity_at).getTime()) / 86400000)
      : null;

    const activitySummary = (activities || []).map((a: any) => ({
      type: a.type,
      note: a.meta?.note || a.meta?.old_status ? `${a.meta.old_status} → ${a.meta.new_status}` : undefined,
      when: a.created_at,
    }));

    const prompt = `Analyze this lead's engagement data and qualify them.

Lead Profile:
- Name: ${lead.full_name || "Unknown"}
- Email: ${lead.email || "N/A"}
- Phone: ${lead.phone || "N/A"}
- Source: ${lead.source || "Unknown"}
- Current Score: ${lead.score ?? 0}
- Current Status: ${lead.status || "New"}
- Tags: ${(lead.tags || []).join(", ") || "None"}
- Notes: ${lead.notes || "None"}
- Created: ${createdDaysAgo} days ago
- Last Activity: ${lastActivityDaysAgo !== null ? `${lastActivityDaysAgo} days ago` : "Never"}

Activity History (${activitySummary.length} events, newest first):
${JSON.stringify(activitySummary, null, 1)}

Analyze:
1. Engagement velocity (how quickly they engage after first contact)
2. Channel diversity (email opens, link clicks, form submissions, calls, etc.)
3. High-intent signals (pricing page visits, call bookings, webinar registrations, lead magnet downloads)
4. Recency (are they actively engaging or gone cold?)
5. Overall pattern (are they progressing through the buyer journey?)

Return your qualification using the provided tool.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert B2B/B2C lead qualification analyst. Analyze engagement patterns to determine lead quality. Be specific in your reasoning — cite actual activities and patterns. Keep reasoning under 3 sentences.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "qualify_lead",
              description: "Return the AI qualification verdict for this lead.",
              parameters: {
                type: "object",
                properties: {
                  verdict: {
                    type: "string",
                    enum: ["hot", "warm", "cold", "not_qualified"],
                    description: "hot = ready to buy, warm = engaged but not ready, cold = minimal engagement, not_qualified = insufficient data",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0-100",
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why this verdict was chosen (2-3 sentences max)",
                  },
                  recommended_action: {
                    type: "string",
                    description: "One specific next action to take with this lead",
                  },
                },
                required: ["verdict", "confidence", "reasoning", "recommended_action"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "qualify_lead" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), { status: 429, headers: corsHeaders });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), { status: 402, headers: corsHeaders });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI qualification failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), { status: 500, headers: corsHeaders });
    }

    let qualification: any;
    try {
      qualification = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500, headers: corsHeaders });
    }

    // Add timestamp
    qualification.qualified_at = new Date().toISOString();

    // Write back to leads table using service role for the update
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await serviceClient
      .from("leads")
      .update({ ai_qualification: qualification })
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save qualification" }), { status: 500, headers: corsHeaders });
    }

    // Log activity
    await serviceClient.from("lead_activities").insert({
      lead_id,
      user_id: user.id,
      workspace_id,
      type: "ai_qualification",
      meta: { verdict: qualification.verdict, confidence: qualification.confidence },
    });

    return new Response(JSON.stringify({ qualification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("qualify-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
