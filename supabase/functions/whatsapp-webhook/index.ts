import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findWorkspaceByWhatsAppPhoneNumberId } from "../_shared/channel-credentials.ts";
import { normalizePhoneE164 as normalizePhone } from "../_shared/phone.ts";
import { verifyMetaSignature } from "../_shared/meta-hmac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("nexusflo24-whatsapp"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function phoneCandidates(raw: string): string[] {
  const set = new Set<string>();
  const normalized = normalizePhone(raw);
  const digits = raw.replace(/\D/g, "");

  if (raw) set.add(raw);
  if (normalized) {
    set.add(normalized);
    const normalizedDigits = normalized.replace(/^\+/, "");
    set.add(normalizedDigits);

    if (normalized.startsWith("+44") && normalized.length === 13) {
      set.add(`0${normalized.slice(3)}`);
    }
  }

  if (digits) {
    set.add(digits);
    if (digits.startsWith("44") && digits.length === 12) {
      set.add(`0${digits.slice(2)}`);
      set.add(`+${digits}`);
    }
  }

  return [...set].filter(Boolean);
}

Deno.serve(async (req) => {
  // OPTIONS = CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET = Meta webhook verification challenge
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook GET verification request:", { mode, hasToken: !!token, hasChallenge: !!challenge });

    if (mode !== "subscribe" || !token || !challenge) {
      console.log("Missing or invalid params — returning 400");
      return new Response("Bad request", { status: 400 });
    }

    const encryptionKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("WHATSAPP_SETTINGS_ENCRYPTION_KEY not set");
      return new Response("Server error", { status: 500 });
    }

    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: allSettings, error: fetchErr } = await adminClient
        .from("whatsapp_settings")
        .select("verify_token_encrypted")
        .eq("is_active", true);

      if (fetchErr) {
        console.error("DB fetch error:", fetchErr.message);
        return new Response("Server error", { status: 500 });
      }

      console.log(`Found ${allSettings?.length ?? 0} active whatsapp_settings rows`);

      let verified = false;
      for (const s of allSettings || []) {
        try {
          const decryptedToken = await decrypt(s.verify_token_encrypted, encryptionKey);
          if (decryptedToken === token) {
            verified = true;
            break;
          }
        } catch (decErr) {
          console.error("Decryption failed for a row:", decErr);
        }
      }

      if (!verified) {
        console.log("No matching verify token found — returning 403");
        return new Response("Forbidden", { status: 403 });
      }

      console.log("Verify token matched — returning challenge");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("Unexpected error during GET verification:", err);
      return new Response("Server error", { status: 500 });
    }
  }

  // POST = inbound messages + status updates from Meta
  if (req.method === "POST") {
    try {
      // Verify Meta HMAC signature on raw body before parsing JSON
      const rawBody = await req.text();
      const sigHeader = req.headers.get("x-hub-signature-256") || req.headers.get("X-Hub-Signature-256");
      const appSecret = Deno.env.get("META_APP_SECRET") || Deno.env.get("WHATSAPP_APP_SECRET") || "";
      const valid = appSecret
        ? await verifyMetaSignature(rawBody, sigHeader, [appSecret])
        : false;
      if (!valid) {
        console.warn("whatsapp-webhook: invalid or missing X-Hub-Signature-256");
        return new Response("Forbidden", { status: 403 });
      }
      const payload = JSON.parse(rawBody);
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Idempotent webhook log — the same callback re-delivered by Meta hits
      // the unique event_key and is skipped.
      const eventKey = await sha256Hex(rawBody);
      const firstPhoneId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || null;
      const statusCount = (payload?.entry || []).reduce(
        (n: number, e: any) => n + (e?.changes || []).reduce((m: number, c: any) => m + (c?.value?.statuses?.length || 0), 0), 0);
      const messageCount = (payload?.entry || []).reduce(
        (n: number, e: any) => n + (e?.changes || []).reduce((m: number, c: any) => m + (c?.value?.messages?.length || 0), 0), 0);

      const { error: logErr } = await adminClient.from("whatsapp_webhook_events").insert({
        event_key: eventKey,
        phone_number_id: firstPhoneId,
        signature_valid: true,
        event_type: statusCount > 0 ? "statuses" : messageCount > 0 ? "messages" : "other",
        status_count: statusCount,
        message_count: messageCount,
        payload_redacted: redactPayload(payload),
      });
      if (logErr && String(logErr.code) === "23505") {
        console.log("whatsapp-webhook: duplicate callback ignored", { eventKey: eventKey.slice(0, 12) });
        return new Response("OK", { status: 200 });
      }

      const process = async () => {
      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) continue;

          // Look up workspace by phone_number_id
          const { data: settings } = await adminClient
            .from("whatsapp_settings")
            .select("workspace_id")
            .eq("phone_number_id", phoneNumberId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          let workspaceId = settings?.workspace_id || null;
          if (!workspaceId) {
            workspaceId = await findWorkspaceByWhatsAppPhoneNumberId(phoneNumberId);
            if (workspaceId) {
              console.log(`Resolved inbound WhatsApp workspace via workspace_channel_settings for phone_number_id ${phoneNumberId}`);
            } else {
              console.warn(`No workspace found for inbound WhatsApp phone_number_id ${phoneNumberId}`);
              continue;
            }
          }

          // Handle inbound messages
          const messages = value?.messages || [];
          for (const msg of messages) {
            const rawPhone = msg.from ? `+${msg.from}` : "unknown";
            const normalizedPhone = normalizePhone(rawPhone) || rawPhone;
            const msgBody = msg.text?.body || msg.type || "";
            const candidates = phoneCandidates(rawPhone);

            let lead = null;
            const { data: matchedLead } = await adminClient
              .from("leads")
              .select("id, user_id, phone")
              .eq("workspace_id", workspaceId)
              .in("phone", candidates)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            lead = matchedLead;

            if (!lead && normalizedPhone !== "unknown") {
              const { data: workspace } = await adminClient
                .from("workspaces")
                .select("owner_user_id")
                .eq("id", workspaceId)
                .maybeSingle();

              if (workspace?.owner_user_id) {
                const contactName = value?.contacts?.find((c: any) => c?.wa_id === msg.from)?.profile?.name || null;
                const { data: createdLead, error: createLeadErr } = await adminClient
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
                  .select("id, user_id, phone")
                  .single();

                if (createLeadErr) {
                  console.error("Failed to auto-create lead from inbound WhatsApp:", createLeadErr);
                } else {
                  lead = createdLead;
                  console.log(`Created lead ${lead.id} for inbound WhatsApp ${normalizedPhone}`);
                }
              }
            }

            // Resolve default approved WA sender profile for attribution
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
              wa_message_id: msg.id,
              direction: "inbound",
              phone_number: normalizedPhone,
              message_type: msg.type || "text",
              body: msgBody,
              status: "received",
              ...(defSender?.id ? { sender_profile_id: defSender.id } : {}),
              ...(lead?.id ? { lead_id: lead.id } : {}),
            });

            // --- AI WhatsApp Chatbot: auto-reply via AI Sales Closer ---
            if (lead?.id && msg.type === "text" && msgBody) {
              try {
                const { data: closerSettings } = await adminClient
                  .from("sales_closer_settings")
                  .select("is_enabled, channels")
                  .eq("workspace_id", workspaceId)
                  .maybeSingle();

                if (closerSettings?.is_enabled && (closerSettings.channels || []).includes("whatsapp")) {
                  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

                  console.log(`AI WhatsApp Chatbot: Processing inbound from ${normalizedPhone} for lead ${lead.id}`);

                  const aiRes = await fetch(`${supabaseUrl}/functions/v1/ai-sales-closer`, {
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

                  const aiData = await aiRes.json();
                  console.log(`AI WhatsApp Chatbot: Response for lead ${lead.id}:`, JSON.stringify({
                    ok: aiRes.ok,
                    intent: aiData.intent,
                    confidence: aiData.confidence,
                    status: aiData.status,
                    error: aiData.error,
                  }));
                }
              } catch (aiErr) {
                console.error("AI WhatsApp Chatbot error:", aiErr);
              }
            }

            // Fire triggered campaigns with whatsapp_reply trigger
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
              } catch (triggerErr) {
                console.error("whatsapp_reply trigger check error:", triggerErr);
              }
            }
          }

          // Handle status updates (sent → delivered → read; or failed).
          // Meta may deliver these out of order, so we always guard against
          // regressing a "later" status back to an "earlier" one.
          const STATUS_RANK: Record<string, number> = {
            sent: 1, delivered: 2, read: 3, failed: 99,
          };
          const statuses = value?.statuses || [];
          for (const st of statuses) {
            if (!st.id) continue;
            const incoming = String(st.status || "").toLowerCase();
            const incomingRank = STATUS_RANK[incoming] ?? 0;
            if (!incomingRank) continue;

            // Load current row so we can decide idempotency + propagation.
            const { data: waMsg } = await adminClient
              .from("whatsapp_messages")
              .select("id, status, lead_id, workspace_id, campaign_id")
              .eq("wa_message_id", st.id)
              .maybeSingle();
            if (!waMsg) continue;

            const currentRank = STATUS_RANK[String(waMsg.status || "").toLowerCase()] ?? 0;
            // Never regress: e.g. don't overwrite "read" with a late "delivered".
            // "failed" wins over everything except itself.
            const shouldAdvance =
              incoming === "failed" ? waMsg.status !== "failed" : incomingRank > currentRank;
            if (!shouldAdvance) continue;

            const errorTitle = st.errors?.[0]?.title || st.errors?.[0]?.error_data?.details || null;
            const nowIso = new Date().toISOString();
            const patch: Record<string, any> = { status: incoming };
            if (incoming === "delivered") patch.delivered_at = nowIso;
            if (incoming === "read") patch.read_at = nowIso;
            if (incoming === "failed") {
              patch.failed_at = nowIso;
              if (errorTitle) patch.error = errorTitle;
            }

            await adminClient
              .from("whatsapp_messages")
              .update(patch)
              .eq("id", waMsg.id);

            // Propagate to campaign_messages when this WA message belongs to a campaign.
            // Prefer the direct campaign_id link; fall back to lead_id match for legacy rows.
            const cmMatch = adminClient
              .from("campaign_messages")
              .update(
                incoming === "read"
                  ? { opened: true }
                  : incoming === "delivered"
                    ? { delivery_status: "delivered" }
                    : incoming === "failed"
                      ? { delivery_status: "failed", error: errorTitle || "WhatsApp send failed" }
                      : { delivery_status: incoming },
              )
              .eq("workspace_id", waMsg.workspace_id)
              .eq("channel", "whatsapp");

            if (waMsg.campaign_id) {
              cmMatch.eq("campaign_id", waMsg.campaign_id);
            } else if (waMsg.lead_id) {
              cmMatch.eq("lead_id", waMsg.lead_id);
            } else {
              continue;
            }

            // Only advance delivery_status forward for delivered/failed.
            if (incoming === "delivered") {
              cmMatch.in("delivery_status", ["pending", "sent"]);
            } else if (incoming === "failed") {
              cmMatch.in("delivery_status", ["pending", "sent", "delivered"]);
            } else if (incoming === "read") {
              cmMatch.eq("opened", false);
            }

            await cmMatch;
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("whatsapp-webhook POST error:", err);
      return new Response("OK", { status: 200 }); // Always return 200 to Meta
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
