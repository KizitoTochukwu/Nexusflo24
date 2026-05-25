import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Intent labels
type Intent = "pricing_inquiry" | "objection" | "interest" | "ready_to_buy" | "question" | "unsubscribe" | "neutral";

interface ProcessRequest {
  action: "process_inbound" | "generate_follow_up" | "get_conversations";
  workspace_id: string;
  lead_id: string;
  message?: string;
  channel?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require authenticated caller + workspace membership
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const authedClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await authedClient.auth.getClaims();
  const userId = claims?.sub;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  try {
    const body: ProcessRequest = await req.json();
    const { action, workspace_id, lead_id } = body;

    // Verify caller is a member of the requested workspace
    const { data: isMember } = await supabase.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: workspace_id,
    });
    if (!isMember) return json({ error: "Forbidden" }, 403);

    if (action === "get_conversations") {
      const { data, error } = await supabase
        .from("sales_conversations")
        .select("*")
        .eq("lead_id", lead_id)
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return json({ conversations: data });
    }

    // Get settings
    const { data: settings } = await supabase
      .from("sales_closer_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!settings?.is_enabled) {
      return json({ error: "AI Sales Closer is not enabled for this workspace" }, 400);
    }

    // Get lead context
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (!lead) return json({ error: "Lead not found" }, 404);

    // Get conversation history
    const { data: history } = await supabase
      .from("sales_conversations")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Get recent activities
    const { data: activities } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get booking page info if configured
    let bookingSlug = "";
    if (settings.booking_page_id) {
      const { data: bp } = await supabase
        .from("booking_pages")
        .select("slug")
        .eq("id", settings.booking_page_id)
        .single();
      if (bp?.slug) bookingSlug = bp.slug;
    }

    if (action === "process_inbound") {
      const inboundMsg = body.message || "";
      const channel = body.channel || "email";

      // Store inbound message
      await supabase.from("sales_conversations").insert({
        workspace_id,
        lead_id,
        channel,
        direction: "inbound",
        message_body: inboundMsg,
        ai_generated: false,
        status: "delivered",
      });

      // Classify intent + generate reply
      const { intent, confidence, reply } = await classifyAndReply(
        lead, history || [], activities || [], inboundMsg, channel, settings, bookingSlug
      );

      // Update inbound message with intent
      // (we already inserted it, update the most recent inbound)
      const { data: lastInbound } = await supabase
        .from("sales_conversations")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastInbound) {
        await supabase
          .from("sales_conversations")
          .update({ intent, intent_confidence: confidence })
          .eq("id", lastInbound.id);
      }

      // Handle hot lead escalation
      if (intent === "ready_to_buy" && settings.escalation_enabled) {
        const { data: wsData } = await supabase
          .from("workspaces")
          .select("owner_user_id")
          .eq("id", workspace_id)
          .single();
        if (wsData) {
          await supabase.from("notifications").insert({
            workspace_id,
            user_id: wsData.owner_user_id,
            title: "🚀 Lead Ready to Buy!",
            body: `${lead.full_name || lead.email} is ready to buy. AI detected high purchase intent.`,
            type: "sales_escalation",
            meta: { lead_id, intent, confidence },
          });
        }
      }

      // Store AI reply
      const replyStatus = settings.mode === "auto_send" ? "sent" : "pending_approval";
      const { data: replyRecord } = await supabase
        .from("sales_conversations")
        .insert({
          workspace_id,
          lead_id,
          channel,
          direction: "outbound",
          message_body: reply,
          intent,
          intent_confidence: confidence,
          ai_generated: true,
          ai_model: "google/gemini-3-flash-preview",
          status: replyStatus,
          meta: { in_response_to: inboundMsg },
        })
        .select()
        .single();

      // Auto-send if configured
      if (settings.mode === "auto_send" && replyRecord) {
        await sendMessage(channel, lead, reply, workspace_id);
        // Log activity
        await supabase.from("lead_activities").insert({
          lead_id,
          user_id: lead.user_id,
          workspace_id,
          type: "ai_sales_reply",
          meta: { channel, intent, message_preview: reply.substring(0, 100) },
        });
      }

      return json({ intent, confidence, reply, status: replyStatus });
    }

    if (action === "generate_follow_up") {
      const channel = body.channel || "email";
      const { reply } = await generateFollowUp(
        lead, history || [], activities || [], channel, settings, bookingSlug
      );

      const replyStatus = settings.mode === "auto_send" ? "sent" : "pending_approval";
      await supabase.from("sales_conversations").insert({
        workspace_id,
        lead_id,
        channel,
        direction: "outbound",
        message_body: reply,
        ai_generated: true,
        ai_model: "google/gemini-3-flash-preview",
        status: replyStatus,
        meta: { type: "follow_up" },
      });

      if (settings.mode === "auto_send") {
        await sendMessage(channel, lead, reply, workspace_id);
        await supabase.from("lead_activities").insert({
          lead_id,
          user_id: lead.user_id,
          workspace_id,
          type: "ai_follow_up",
          meta: { channel, message_preview: reply.substring(0, 100) },
        });
      }

      return json({ reply, status: replyStatus });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("ai-sales-closer error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(messages: { role: string; content: string }[]) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "sales_response",
            description: "Classify intent and generate sales reply",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: ["pricing_inquiry", "objection", "interest", "ready_to_buy", "question", "unsubscribe", "neutral"],
                },
                confidence: { type: "number", minimum: 0, maximum: 100 },
                reply: { type: "string", description: "The sales reply message to send to the lead" },
              },
              required: ["intent", "confidence", "reply"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "sales_response" } },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error:", resp.status, text);
    throw new Error(`AI gateway error: ${resp.status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  return JSON.parse(toolCall.function.arguments) as {
    intent: Intent;
    confidence: number;
    reply: string;
  };
}

async function classifyAndReply(
  lead: any,
  history: any[],
  activities: any[],
  inboundMessage: string,
  channel: string,
  settings: any,
  bookingSlug: string
) {
  const historyText = history
    .slice(-10)
    .map((m) => `[${m.direction}] ${m.message_body}`)
    .join("\n");

  const activitySummary = activities
    .slice(0, 5)
    .map((a) => `${a.type}: ${JSON.stringify(a.meta)}`)
    .join("\n");

  const systemPrompt = `You are an AI Sales Closer for NexusFlo24, a marketing automation platform.
Your role is to engage leads, answer questions, handle objections, and guide them toward conversion.

Lead Context:
- Name: ${lead.full_name || "Unknown"}
- Email: ${lead.email || "N/A"}
- Score: ${lead.score || 0}
- Status: ${lead.status || "New"}
- Source: ${lead.source || "Unknown"}
- AI Qualification: ${lead.ai_qualification ? JSON.stringify(lead.ai_qualification) : "Not qualified"}

Recent Activities:
${activitySummary || "None"}

Conversation History:
${historyText || "No previous conversation"}

${bookingSlug ? `Booking Link: ${bookingSlug} (suggest booking a call when interest is high)` : ""}

${settings.system_prompt ? `Additional Instructions: ${settings.system_prompt}` : ""}

Channel: ${channel}
Rules:
1. Be professional, friendly, and results-driven.
2. Keep messages concise for ${channel === "whatsapp" || channel === "sms" ? "messaging" : "email"}.
3. Handle objections empathetically with value-driven responses.
4. When lead shows high intent (ready_to_buy), suggest booking a call or next steps.
5. Never be pushy or aggressive.
6. If lead wants to unsubscribe, acknowledge respectfully.
7. Personalize using the lead's name and context.`;

  return await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: inboundMessage },
  ]);
}

async function generateFollowUp(
  lead: any,
  history: any[],
  activities: any[],
  channel: string,
  settings: any,
  bookingSlug: string
) {
  const historyText = history
    .slice(-10)
    .map((m) => `[${m.direction}] ${m.message_body}`)
    .join("\n");

  const systemPrompt = `You are an AI Sales Closer for NexusFlo24. Generate a follow-up message for a lead who hasn't responded.

Lead: ${lead.full_name || lead.email || "Unknown"} (Score: ${lead.score || 0}, Status: ${lead.status})

Previous Conversation:
${historyText || "No previous conversation"}

${bookingSlug ? `Booking Link: ${bookingSlug}` : ""}

${settings.system_prompt ? `Additional Instructions: ${settings.system_prompt}` : ""}

Channel: ${channel}
Rules:
1. Be warm and non-pushy.
2. Reference previous conversation if exists.
3. Add value (tip, resource, or insight).
4. Include a soft CTA.
5. Keep it short for ${channel === "whatsapp" || channel === "sms" ? "messaging" : "email"}.`;

  return await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Generate a follow-up message for this lead." },
  ]);
}

async function sendMessage(channel: string, lead: any, message: string, workspaceId: string) {
  try {
    let url = "";
    let payload: Record<string, unknown> = {};

    if (channel === "email" && lead.email) {
      url = `${SUPABASE_URL}/functions/v1/email-send`;
      payload = {
        workspaceId,
        to: lead.email,
        subject: `Following up with you, ${lead.full_name || ""}`.trim(),
        html: message,
        leadId: lead.id,
        skipCredits: true,
      };
    } else if (channel === "whatsapp" && lead.phone) {
      url = `${SUPABASE_URL}/functions/v1/whatsapp-send`;
      payload = {
        workspaceId,
        to: lead.phone,
        body: message,
        leadId: lead.id,
        skipCredits: true,
      };
    } else if (channel === "sms" && lead.phone) {
      url = `${SUPABASE_URL}/functions/v1/sms-send`;
      payload = {
        workspaceId,
        to: lead.phone,
        message,
        skipCredits: true,
      };
    }

    if (url) {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errData = await resp.text();
        console.error(`[ai-sales-closer] ${channel} send failed (${resp.status}):`, errData);
      }
    }
  } catch (e) {
    console.error(`Failed to send ${channel} message:`, e);
  }
}
