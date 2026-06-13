// Twilio WhatsApp inbound webhook.
// Receives application/x-www-form-urlencoded payloads from Twilio with
// `From=whatsapp:+E164`, `To=whatsapp:+E164`, `Body`, `MessageSid`.
// Validates X-Twilio-Signature, looks up the workspace by the `To` number,
// creates/updates a lead, logs the message, and triggers the AI sales closer.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 as normalizePhone } from "../_shared/phone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function decrypt(cipherB64: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["decrypt"]);
  const combined = base64ToBytes(cipherB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

// Twilio request validation:
// signature = base64( HMAC-SHA1( url + sorted_params_concat, authToken ) )
async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  headerSignature: string | null,
): Promise<boolean> {
  if (!headerSignature) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64 === headerSignature;
}

async function findWorkspaceByTwilioNumber(
  adminClient: any,
  toNumber: string,
): Promise<{ workspaceId: string; authToken: string } | null> {
  const encryptionKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
  if (!encryptionKey) return null;

  const normalized = toNumber.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
  const { data: rows } = await adminClient
    .from("workspace_channel_settings")
    .select("workspace_id, config_encrypted")
    .eq("channel", "whatsapp")
    .eq("is_active", true);

  for (const row of rows || []) {
    try {
      const cfg = JSON.parse(await decrypt(row.config_encrypted, encryptionKey));
      if (cfg?.provider !== "twilio") continue;
      const from = String(cfg.from_number || "").replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
      if (from && from === normalized) {
        return { workspaceId: row.workspace_id, authToken: String(cfg.auth_token || "") };
      }
    } catch {/* ignore */}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((v, k) => { params[k] = v; });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const to = params.To || params.to || "";
    const from = params.From || params.from || "";
    const msgBody = params.Body || params.body || "";
    const messageSid = params.MessageSid || params.SmsMessageSid || "";

    if (!to || !from) return new Response("Bad request", { status: 400 });

    const lookup = await findWorkspaceByTwilioNumber(adminClient, to);
    const platformAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const authTokenForValidation = lookup?.authToken || platformAuthToken;

    // Signature validation
    const sigHeader = req.headers.get("x-twilio-signature") || req.headers.get("X-Twilio-Signature");
    const url = req.url; // Twilio signs the full request URL
    const valid = authTokenForValidation
      ? await validateTwilioSignature(authTokenForValidation, url, params, sigHeader)
      : false;
    if (!valid) {
      console.warn("twilio-whatsapp-webhook: invalid X-Twilio-Signature", { to, from });
      return new Response("Forbidden", { status: 403 });
    }

    if (!lookup) {
      console.warn("No workspace mapped to Twilio WhatsApp number", { to });
      return new Response("OK", { status: 200 });
    }
    const workspaceId = lookup.workspaceId;
    const rawPhone = from.replace(/^whatsapp:/, "");
    const normalizedPhone = normalizePhone(rawPhone) || rawPhone;

    // Lead lookup / auto-create
    let lead: { id: string } | null = null;
    const { data: matchedLead } = await adminClient
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = matchedLead;

    if (!lead) {
      const { data: workspace } = await adminClient
        .from("workspaces").select("owner_user_id").eq("id", workspaceId).maybeSingle();
      if (workspace?.owner_user_id) {
        const contactName = params.ProfileName || null;
        const { data: created, error: createErr } = await adminClient
          .from("leads")
          .insert({
            workspace_id: workspaceId,
            user_id: workspace.owner_user_id,
            full_name: contactName,
            phone: normalizedPhone,
            source: "whatsapp_inbound",
            status: "New",
            pipeline_stage: "new",
          })
          .select("id")
          .single();
        if (createErr) {
          console.error("twilio-whatsapp-webhook: failed to create lead", createErr);
        } else {
          lead = created;
        }
      }
    }

    const { data: defSender } = await adminClient
      .from("sender_profiles")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("channel", "whatsapp")
      .eq("status", "approved")
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      provider: "twilio",
      provider_message_id: messageSid,
      direction: "inbound",
      phone_number: normalizedPhone,
      message_type: "text",
      body: msgBody,
      status: "received",
      ...(defSender?.id ? { sender_profile_id: defSender.id } : {}),
      ...(lead?.id ? { lead_id: lead.id } : {}),
    });

    // AI auto-reply (mirrors Meta webhook behavior)
    if (lead?.id && msgBody) {
      try {
        const { data: closerSettings } = await adminClient
          .from("sales_closer_settings")
          .select("is_enabled, channels")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (closerSettings?.is_enabled && (closerSettings.channels || []).includes("whatsapp")) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/ai-sales-closer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              action: "process_inbound",
              workspace_id: workspaceId,
              lead_id: lead.id,
              message: msgBody,
              channel: "whatsapp",
            }),
          });
        }
      } catch (aiErr) {
        console.error("twilio-whatsapp-webhook AI error:", aiErr);
      }
    }

    // Triggered campaigns
    if (lead) {
      try {
        const { data: triggeredCampaigns } = await adminClient
          .from("campaigns")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("campaign_mode", "triggered")
          .eq("status", "active")
          .contains("trigger_config", { type: "whatsapp_reply" });
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        for (const camp of triggeredCampaigns || []) {
          await fetch(`${supabaseUrl}/functions/v1/execute-campaign`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ campaign_id: camp.id, lead_ids: [lead.id] }),
          });
        }
      } catch (e) {
        console.error("twilio-whatsapp-webhook trigger error:", e);
      }
    }

    return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
  } catch (err) {
    console.error("twilio-whatsapp-webhook error:", err);
    return new Response("OK", { status: 200 }); // never 5xx back to Twilio
  }
});
