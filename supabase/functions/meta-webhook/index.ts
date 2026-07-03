import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptMeta, matchKeyword } from "../_shared/meta-crypto.ts";
import { verifyMetaSignature } from "../_shared/meta-hmac.ts";
import { normalizePhoneE164 } from "../_shared/phone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !challenge) {
      return new Response("Bad request", { status: 400 });
    }

    const encryptionKey = Deno.env.get("META_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey) return new Response("Server error", { status: 500 });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows } = await adminClient
      .from("meta_settings")
      .select("verify_token_encrypted")
      .eq("is_active", true);

    for (const row of rows || []) {
      try {
        if (!row.verify_token_encrypted) continue;
        const decrypted = await decryptMeta(row.verify_token_encrypted, encryptionKey);
        if (decrypted === token) {
          return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
        }
      } catch (_) { /* keep trying */ }
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
  // Read raw body for HMAC verification before JSON-parsing
  const rawBody = await req.text();
  const sigHeader = req.headers.get("x-hub-signature-256") || req.headers.get("X-Hub-Signature-256");

  const encryptionKey = Deno.env.get("META_SETTINGS_ENCRYPTION_KEY");
  if (!encryptionKey) {
    console.error("META_SETTINGS_ENCRYPTION_KEY not set; rejecting webhook");
    return new Response("Server error", { status: 500 });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Collect candidate app secrets from active meta_settings and verify HMAC
    const { data: secretRows } = await adminClient
      .from("meta_settings")
      .select("app_secret_encrypted")
      .eq("is_active", true);

    const appSecrets: string[] = [];
    for (const row of secretRows || []) {
      if (!row.app_secret_encrypted) continue;
      try {
        const s = await decryptMeta(row.app_secret_encrypted, encryptionKey);
        if (s) appSecrets.push(s);
      } catch (_) { /* skip */ }
    }
    const envSecret = Deno.env.get("META_APP_SECRET");
    if (envSecret) appSecrets.push(envSecret);

    const valid = await verifyMetaSignature(rawBody, sigHeader, appSecrets);
    if (!valid) {
      console.warn("meta-webhook: invalid or missing X-Hub-Signature-256");
      return new Response("Forbidden", { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const entries = payload?.entry || [];
    for (const entry of entries) {
      // Resolve workspace via the entry id (Page ID for FB, IG account id for IG)
      const entryId = entry?.id;
      if (!entryId) continue;

      const { data: settings } = await adminClient
        .from("meta_settings")
        .select("id, workspace_id, page_id, ig_user_id")
        .or(`page_id.eq.${entryId},ig_user_id.eq.${entryId}`)
        .eq("is_active", true)
        .maybeSingle();

      if (!settings) {
        console.warn(`No meta_settings for entry id ${entryId}`);
        continue;
      }

      const workspaceId = settings.workspace_id;
      const platform: "instagram" | "facebook" = entryId === settings.ig_user_id ? "instagram" : "facebook";

      // ---------- Comments on posts (IG: changes[].field === "comments"; FB: changes[].field === "feed") ----------
      const changes = entry?.changes || [];
      for (const change of changes) {
        const field = change?.field;
        const value = change?.value;
        if (!value) continue;

        // ---------- Facebook Lead Ads (field === "leadgen") ----------
        if (field === "leadgen") {
          try {
            await handleLeadgen({
              adminClient,
              encryptionKey,
              settingsId: settings.id,
              workspaceId,
              value,
            });
          } catch (e) {
            console.error("leadgen handler failed:", e);
          }
          continue;
        }


        const isIgComment = platform === "instagram" && field === "comments";
        const isFbComment = platform === "facebook" && field === "feed" && value?.item === "comment" && value?.verb === "add";

        if (!isIgComment && !isFbComment) continue;

        const commentId: string | undefined = value?.id || value?.comment_id;
        const text: string = value?.text || value?.message || "";
        const fromId: string | undefined = value?.from?.id;
        const fromName: string | undefined = value?.from?.username || value?.from?.name;
        const postId: string | undefined = value?.media?.id || value?.post_id || value?.parent_id;

        if (!commentId || !text) continue;

        // Dedup: skip if we've already logged this comment_id
        const { data: existingMsg } = await adminClient
          .from("social_messages")
          .select("id")
          .eq("external_id", commentId)
          .eq("direction", "inbound")
          .maybeSingle();
        if (existingMsg) continue;

        const lead = await upsertLead(adminClient, workspaceId, platform, fromId, fromName, "social_comment");

        await adminClient.from("social_messages").insert({
          workspace_id: workspaceId,
          lead_id: lead?.id || null,
          platform,
          channel_type: "comment",
          direction: "inbound",
          external_id: commentId,
          post_id: postId || null,
          sender_id: fromId || null,
          sender_username: fromName || null,
          body: text,
          status: "received",
        });

        await fireKeywordTriggers({
          adminClient,
          supabaseUrl,
          serviceRoleKey,
          workspaceId,
          platform,
          source: "comment",
          text,
          postId,
          leadId: lead?.id,
          commentId,
        });
      }

      // ---------- DMs (IG: messaging[]; FB Messenger: messaging[]) ----------
      const messaging = entry?.messaging || [];
      for (const m of messaging) {
        if (!m?.message || m?.message?.is_echo) continue;
        const externalId: string = m.message.mid;
        const text: string = m.message.text || "";
        const senderId: string = m?.sender?.id;
        if (!externalId || !text || !senderId) continue;

        // Dedup
        const { data: existingMsg } = await adminClient
          .from("social_messages")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();
        if (existingMsg) continue;

        const lead = await upsertLead(adminClient, workspaceId, platform, senderId, null, "social_dm");

        await adminClient.from("social_messages").insert({
          workspace_id: workspaceId,
          lead_id: lead?.id || null,
          platform,
          channel_type: "dm",
          direction: "inbound",
          external_id: externalId,
          sender_id: senderId,
          body: text,
          status: "received",
        });

        await fireKeywordTriggers({
          adminClient,
          supabaseUrl,
          serviceRoleKey,
          workspaceId,
          platform,
          source: "dm",
          text,
          leadId: lead?.id,
          recipientId: senderId,
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("meta-webhook POST error:", err);
    return new Response("OK", { status: 200 }); // always 200 to Meta
  }
});

async function upsertLead(
  client: any,
  workspaceId: string,
  platform: "instagram" | "facebook",
  externalId: string | undefined,
  username: string | null | undefined,
  source: string,
) {
  if (!externalId) return null;
  const handleKey = platform === "instagram" ? "ig_user_id" : "fb_user_id";

  const { data: existing } = await client
    .from("leads")
    .select("id, social_handles")
    .eq("workspace_id", workspaceId)
    .filter(`social_handles->>${handleKey}`, "eq", externalId)
    .maybeSingle();

  if (existing) {
    if (username) {
      const merged = { ...(existing.social_handles || {}), [handleKey]: externalId };
      if (platform === "instagram") merged.ig_username = username;
      if (platform === "facebook") merged.fb_user_name = username;
      await client.from("leads").update({
        social_handles: merged,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    }
    return existing;
  }

  const { data: ws } = await client
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws?.owner_user_id) return null;

  const handles: Record<string, string> = { [handleKey]: externalId };
  if (username) {
    if (platform === "instagram") handles.ig_username = username;
    if (platform === "facebook") handles.fb_user_name = username;
  }

  const { data: created, error } = await client
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      user_id: ws.owner_user_id,
      full_name: username || `${platform === "instagram" ? "IG" : "FB"} user`,
      source,
      status: "New",
      pipeline_stage: "new_lead",
      tags: [platform],
      social_handles: handles,
      last_activity_at: new Date().toISOString(),
    })
    .select("id, social_handles")
    .single();

  if (error) {
    console.error("Failed to create lead from social inbound:", error);
    return null;
  }
  return created;
}

async function fireKeywordTriggers(args: {
  adminClient: any;
  supabaseUrl: string;
  serviceRoleKey: string;
  workspaceId: string;
  platform: "instagram" | "facebook";
  source: "comment" | "dm";
  text: string;
  postId?: string;
  leadId?: string;
  commentId?: string;
  recipientId?: string;
}) {
  const { adminClient, supabaseUrl, serviceRoleKey, workspaceId, platform, source, text, postId, leadId, commentId, recipientId } = args;
  if (!leadId) return;

  const { data: triggers } = await adminClient
    .from("social_keyword_triggers")
    .select("id, automation_id, keyword, match_mode, post_id")
    .eq("workspace_id", workspaceId)
    .eq("platform", platform)
    .eq("trigger_source", source)
    .eq("is_active", true);

  for (const t of triggers || []) {
    if (t.post_id && postId && t.post_id !== postId) continue;
    if (!matchKeyword(text, t.keyword, t.match_mode)) continue;

    // Fire the automation by enqueuing a scheduled job (mirrors enqueue_folder_automations pattern)
    try {
      await adminClient.from("scheduled_jobs").insert({
        workspace_id: workspaceId,
        automation_id: t.automation_id,
        lead_id: leadId,
        step_index: 0,
        run_at: new Date().toISOString(),
        status: "pending",
        payload: {
          automation_id: t.automation_id,
          lead_id: leadId,
          workspace_id: workspaceId,
          source: `social_${source}_keyword`,
          platform,
          keyword: t.keyword,
          comment_id: commentId || null,
          recipient_id: recipientId || null,
          post_id: postId || null,
        },
      });
    } catch (e) {
      console.error("Failed to enqueue social keyword automation:", e);
    }

    // For comment triggers: send instant private DM reply via meta-send (Meta allows one private reply per comment)
    if (source === "comment" && commentId) {
      // The automation will normally send the DM; the instant reply is optional.
      // We let the automation handle the DM step to keep messaging consistent.
    }
  }
}
