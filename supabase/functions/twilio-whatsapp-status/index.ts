// Twilio WhatsApp status callback — updates whatsapp_messages.status by
// provider_message_id (MessageSid).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case "queued":
    case "accepted":
      return "sent";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "undelivered":
      return "failed";
    default:
      return twilioStatus || "sent";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const raw = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(raw).forEach((v, k) => { params[k] = v; });

    const sid = params.MessageSid || params.SmsSid || "";
    const status = params.MessageStatus || params.SmsStatus || "";
    if (!sid) return new Response("OK", { status: 200 });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const mapped = mapStatus(status);
    const { data: msg } = await adminClient
      .from("whatsapp_messages")
      .update({ status: mapped, ...(params.ErrorMessage ? { error: params.ErrorMessage } : {}) })
      .eq("provider", "twilio")
      .eq("provider_message_id", sid)
      .select("lead_id, workspace_id")
      .maybeSingle();

    // Mirror Meta behavior on read/delivered → update campaign_messages
    if (msg?.lead_id && msg.workspace_id) {
      if (mapped === "read") {
        await adminClient
          .from("campaign_messages")
          .update({ opened: true })
          .eq("lead_id", msg.lead_id)
          .eq("channel", "whatsapp")
          .eq("workspace_id", msg.workspace_id)
          .eq("opened", false);
      } else if (mapped === "delivered") {
        await adminClient
          .from("campaign_messages")
          .update({ delivery_status: "delivered" })
          .eq("lead_id", msg.lead_id)
          .eq("channel", "whatsapp")
          .eq("workspace_id", msg.workspace_id)
          .in("delivery_status", ["pending", "sent"]);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("twilio-whatsapp-status error:", err);
    return new Response("OK", { status: 200 });
  }
});
