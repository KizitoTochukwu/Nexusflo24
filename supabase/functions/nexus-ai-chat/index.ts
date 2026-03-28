import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Nexus AI, the friendly and knowledgeable AI assistant for NexusFlo24 — an all-in-one AI-powered marketing automation platform.

Your role:
- Help visitors understand NexusFlo24's features: AI Lead Generation, Smart CRM, Email/WhatsApp/SMS automation, Funnel Builder, AI Copywriter, Analytics, and Integrations.
- Answer questions about pricing plans: Starter ($29/mo), Plus ($59/mo), Pro ($99/mo), Enterprise ($199/mo). All plans include a free trial.
- Guide users to sign up, book a demo, or explore features.
- Be concise, helpful, and results-driven. Keep answers under 3 sentences unless more detail is requested.
- If a visitor seems interested or asks about pricing/features more than once, encourage them to share their name and email so you can send them more info or schedule a demo. Ask naturally — don't be pushy.
- You can also help with general marketing questions and tips.

Tone: Professional, warm, and action-oriented. Use occasional emojis sparingly (1-2 max per message).

Important links:
- Pricing: /pricing
- Features: /features
- Register: /register
- Contact/Demo: /contact

LEAD CAPTURE RULES:
When a visitor provides their name AND email address in conversation, respond normally but also include a special hidden tag at the very end of your message in this exact format:
[LEAD_CAPTURED:name=Their Name;email=their@email.com]
This tag will be processed by the system and hidden from the user. Only include it when BOTH name and email are explicitly provided by the visitor.

HUMAN HANDOFF RULES:
When a visitor asks to speak with a human, connect with a real person, talk to support, or similar requests:
1. Respond helpfully — mention they can book a demo at /contact or reach the team directly.
2. If the visitor already provided their name and email earlier in the conversation, proactively offer that a team member will reach out.
3. Always include the hidden tag [HUMAN_HANDOFF] at the very end of your message (after any LEAD_CAPTURED tag if present).
4. Encourage them to share their name and email if they haven't already, so the team can follow up.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, capturedLead, humanHandoff } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If frontend sends captured lead data, store it
    if (capturedLead?.email) {
      try {
        const { data: ws } = await adminClient.from("workspaces").select("id, owner_user_id").limit(1).single();
        if (ws) {
          await adminClient.from("leads").insert({
            workspace_id: ws.id,
            user_id: ws.owner_user_id,
            full_name: capturedLead.name || null,
            email: capturedLead.email,
            source: "AI Chatbot",
            status: "New",
            notes: `Captured via Nexus AI chatbot conversation. Intent: ${capturedLead.intent || "General inquiry"}`,
          });
          console.log("Chatbot lead captured:", capturedLead.email);
        }
      } catch (err) {
        console.warn("Failed to capture chatbot lead:", err);
      }
    }

    // Human handoff: create a notification for the workspace owner
    if (humanHandoff) {
      try {
        const { data: ws } = await adminClient.from("workspaces").select("id, owner_user_id").limit(1).single();
        if (ws) {
          await adminClient.from("notifications").insert({
            workspace_id: ws.id,
            user_id: ws.owner_user_id,
            title: "🙋 Human Agent Requested",
            body: humanHandoff.name
              ? `${humanHandoff.name} (${humanHandoff.email || "no email"}) wants to speak with a team member.`
              : "A visitor requested to speak with a human agent via the chatbot.",
            type: "human_handoff",
            meta: { name: humanHandoff.name || null, email: humanHandoff.email || null },
          });
          console.log("Human handoff notification created");
        }
      } catch (err) {
        console.warn("Failed to create handoff notification:", err);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nexus-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
