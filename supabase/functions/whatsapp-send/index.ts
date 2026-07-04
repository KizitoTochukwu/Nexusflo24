import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { decryptWhatsApp, encryptChannelConfig } from "../_shared/whatsapp-crypto.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";
import { normalizePhoneE164 as normalizePhone } from "../_shared/phone.ts";
import { isCredentialError, notifyCredentialFailure } from "../_shared/credential-alert.ts";
import { resolveSenderProfile } from "../_shared/sender-resolver.ts";
import { logCommunicationUsage, getDeductionAmount, countryFromE164 } from "../_shared/usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type WhatsAppAttemptResult = {
  ok: boolean;
  data: any;
  phoneNumberId: string;
  source: "workspace" | "platform";
};

function hasMetaCredentials(config: Record<string, string> | undefined): config is Record<string, string> {
  return Boolean(config?.access_token?.trim() && config?.phone_number_id?.trim());
}

async function repairWorkspaceChannelSettings(
  adminClient: any,
  workspaceId: string,
  config: Record<string, string>,
) {
  const channelKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
  if (!channelKey || !hasMetaCredentials(config)) return;

  const configEncrypted = await encryptChannelConfig(
    JSON.stringify({
      provider: "meta",
      access_token: config.access_token,
      phone_number_id: config.phone_number_id,
    }),
    channelKey,
  );

  const { data: existing } = await adminClient
    .from("workspace_channel_settings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("channel", "whatsapp")
    .maybeSingle();

  if (existing?.id) {
    await adminClient
      .from("workspace_channel_settings")
      .update({ config_encrypted: configEncrypted, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await adminClient.from("workspace_channel_settings").insert({
      workspace_id: workspaceId,
      channel: "whatsapp",
      config_encrypted: configEncrypted,
      is_active: true,
    });
  }
}

async function resolveMetaCredentials(
  adminClient: any,
  workspaceId: string,
  platformFallback: Record<string, string | undefined>,
) {
  const workspaceCreds = await resolveChannelCredentials(workspaceId, "whatsapp", {});
  if (hasMetaCredentials(workspaceCreds.config)) return workspaceCreds;

  const whatsappKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
  if (whatsappKey) {
    const { data: settingsRows } = await adminClient
      .from("whatsapp_settings")
      .select("phone_number_id, access_token_encrypted, is_active, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const settings = settingsRows?.[0];
    if (settings?.phone_number_id && settings?.access_token_encrypted) {
      try {
        const config = {
          access_token: await decryptWhatsApp(settings.access_token_encrypted, whatsappKey),
          phone_number_id: String(settings.phone_number_id),
        };
        if (hasMetaCredentials(config)) {
          await repairWorkspaceChannelSettings(adminClient, workspaceId, config).catch((err) => {
            console.warn("whatsapp-send: failed to repair workspace channel settings", err);
          });
          return { source: "workspace" as const, config };
        }
      } catch (err) {
        console.warn("whatsapp-send: failed to decrypt active WhatsApp settings", err);
      }
    }
  }

  const platformConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(platformFallback)) {
    if (value?.trim()) platformConfig[key] = value.trim();
  }

  if (hasMetaCredentials(platformConfig)) {
    return { source: "platform" as const, config: platformConfig };
  }

  return { source: "none" as const, config: {} };
}

function buildWhatsAppError(waRes: Response, waData: any) {
  const graphMessage = waData?.error?.message || `WhatsApp API error: ${waRes.status}`;
  const graphCode = Number(waData?.error?.code ?? 0);
  const graphSubcode = Number(waData?.error?.error_subcode ?? 0);
  const graphType = String(waData?.error?.type ?? "GraphMethodException");

  const isCredentialMismatch =
    /Unsupported post request|does not exist|missing permissions/i.test(graphMessage) ||
    (graphCode === 100 && /object with id|cannot find|not found/i.test(graphMessage));

  const isTokenOrPermissionError = graphCode === 190 || graphCode === 10 || graphCode === 200;

  // 132xxx = template-related errors (not approved, name/language mismatch,
  // paused, disabled, etc). Surface a clear, actionable message instead of
  // the generic Graph string.
  const isTemplateError = graphCode >= 132000 && graphCode < 133000;

  const errMsg = isTemplateError
    ? `WhatsApp template error [${graphCode}]: ${graphMessage}. Open Settings → Channels → WhatsApp and click "Sync templates from Meta", then pick an APPROVED template (matching name + language) as your default re-engagement template.`
    : isCredentialMismatch
    ? "WhatsApp credentials mismatch: the Phone Number ID and Access Token are not linked. Reconnect WhatsApp in Settings → Channels."
    : isTokenOrPermissionError
      ? "WhatsApp token is invalid, expired, or missing required permissions (whatsapp_business_messaging). Reconnect WhatsApp in Settings → Channels."
      : `[${graphType} ${graphCode}${graphSubcode ? `/${graphSubcode}` : ""}] ${graphMessage}`;

  return { errMsg, graphCode, graphSubcode, isCredentialMismatch, isTokenOrPermissionError, isTemplateError };
}

interface TemplatePayload {
  name: string;
  language: string;
  components?: Array<Record<string, unknown>>;
}

async function sendWhatsAppMessage(
  accessToken: string,
  rawPhoneNumberId: string,
  to: string,
  msgBody: string,
  source: "workspace" | "platform",
  template?: TemplatePayload,
): Promise<WhatsAppAttemptResult> {
  const phoneNumberId = rawPhoneNumberId.replace(/[^\d]/g, "");

  if (phoneNumberId.length < 6) {
    throw new Error("WhatsApp configuration error: invalid Phone Number ID format.");
  }

  const waTo = to.startsWith("+") ? to.slice(1) : to;

  let waPayload: Record<string, unknown>;
  if (template) {
    waPayload = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language || "en" },
        ...(template.components ? { components: template.components } : {}),
      },
    };
  } else {
    waPayload = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "text",
      text: { body: msgBody },
    };
  }

  const waRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(waPayload),
  });

  const waData = await waRes.json();
  return { ok: waRes.ok, data: waData, phoneNumberId, source };
}

/**
 * Resolve a template LIVE against Meta's Graph API so we never trust a stale
 * local cache (HubSpot / GHL / Wati all do this before every template send).
 * Returns the exact { name, language, components } that Meta will accept, or
 * null if no approved variant exists on the WABA our token is calling.
 * Self-heals the local `whatsapp_templates` + `whatsapp_settings.waba_id`.
 */
async function resolveLiveTemplate(
  adminClient: any,
  workspaceId: string,
  accessToken: string,
  phoneNumberId: string,
  templateName: string,
  preferredLanguage: string | undefined,
): Promise<{ name: string; language: string; components: any[] | null } | null> {
  // 1. Resolve WABA id (cached on whatsapp_settings, else fetched from phone).
  let wabaId: string | null = null;
  const { data: wsRows } = await adminClient
    .from("whatsapp_settings")
    .select("id, waba_id")
    .eq("workspace_id", workspaceId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);
  const wsRow = wsRows?.[0];
  wabaId = wsRow?.waba_id || null;

  if (!wabaId) {
    try {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}?fields=whatsapp_business_account_id`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const phoneData = await phoneRes.json();
      wabaId = phoneData?.whatsapp_business_account_id || null;
      if (wabaId && wsRow?.id) {
        await adminClient
          .from("whatsapp_settings")
          .update({ waba_id: wabaId, updated_at: new Date().toISOString() })
          .eq("id", wsRow.id);
      }
    } catch (err) {
      console.warn("resolveLiveTemplate: WABA lookup failed", err);
    }
  }
  if (!wabaId) return null;

  // 2. Query live templates for this name.
  let tplData: any = null;
  try {
    const tplRes = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(wabaId)}/message_templates?name=${encodeURIComponent(templateName)}&fields=name,language,status,components&limit=25`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    tplData = await tplRes.json();
  } catch (err) {
    console.warn("resolveLiveTemplate: template fetch failed", err);
    return null;
  }

  const approved = (tplData?.data || []).filter(
    (t: any) => String(t?.status).toUpperCase() === "APPROVED" && t?.name === templateName,
  );
  if (approved.length === 0) return null;

  const preferred = (preferredLanguage || "").trim();
  const base = preferred.split(/[_-]/)[0].toLowerCase();
  const picked =
    approved.find((t: any) => t.language === preferred) ||
    approved.find((t: any) => String(t.language).toLowerCase().startsWith(base)) ||
    approved[0];

  // 3. Self-heal local cache.
  try {
    await adminClient
      .from("whatsapp_templates")
      .update({
        language: picked.language,
        status: "approved",
        components: picked.components || null,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("name", templateName);
  } catch (err) {
    console.warn("resolveLiveTemplate: cache heal failed", err);
  }

  return {
    name: picked.name,
    language: picked.language,
    components: picked.components || null,
  };
}

/** Check if the 24-hour conversation window is open for a given phone number */
async function isWindowOpen(
  adminClient: any,
  workspaceId: string,
  phoneNumber: string,
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await adminClient
    .from("whatsapp_messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", phoneNumber)
    .eq("direction", "inbound")
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);

  return Boolean(data && data.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    const body = await req.json();
    const { workspaceId, to, type = "text", leadId, campaignId, template, skipCredits } = body;
    // Preview / test sends from the editor — skip credits + prefix [TEST].
    const isPreview = (body as any).preview === true;
    // WhatsApp text messages are plain-text — strip any HTML that may have
    // leaked in from the rich-text editor (legacy automation/campaign steps
    // store contentEditable innerHTML which renders literally on WhatsApp).
    let msgBody = htmlToPlainText(body?.body);
    // Strip any unresolved {{token}} so recipients never see literal placeholders.
    msgBody = msgBody ? msgBody.replace(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\|[^}]*)?\s*\}\}/g, "") : msgBody;
    if (isPreview && msgBody) msgBody = `[TEST] ${msgBody}`;

    if (!workspaceId || !to || (!msgBody && !template)) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspaceId, to, body (or template)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use E.164 format like +447517327597" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Provider dispatch ─────────────────────────────────────────────
    // Resolve workspace channel settings up-front so we can route to
    // Twilio when provider="twilio" was selected in Settings → Channels.
    // The Meta flow below is unchanged for "meta" (default) workspaces.
    const dispatchCreds = await resolveChannelCredentials(workspaceId, "whatsapp", {});
    const dispatchProvider = String(dispatchCreds.config.provider || "meta").toLowerCase();
    if (dispatchProvider === "twilio") {
      console.log("[whatsapp-send] routing to Twilio provider", { workspaceId });
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const fwd = await fetch(`${supabaseUrl}/functions/v1/twilio-whatsapp-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          workspaceId,
          to: normalizedTo,
          body: msgBody,
          leadId,
          campaignId,
          contentSid: (template as any)?.contentSid,
          contentVariables: (template as any)?.contentVariables,
          sender_profile_id: (body as any).sender_profile_id,
          skipCredits,
          preview: isPreview,
        }),
      });
      const fwdData = await fwd.json().catch(() => ({}));
      return new Response(JSON.stringify(fwdData), {
        status: fwd.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    let callerUserId: string | undefined;
    if (!isServiceRole) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const user = { id: claimsData.claims.sub as string };
      callerUserId = user.id;

      const { data: isMember } = await adminClient.rpc("is_workspace_member", { _user_id: user.id, _workspace_id: workspaceId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check and deduct credits — skip on preview tests, or if service-role + skipCredits + workspace owner is admin
    let shouldDeductCredits = !isPreview;
    if (shouldDeductCredits && isServiceRole && skipCredits) {
      const { data: ws } = await adminClient.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
      if (ws?.owner_user_id && await isAdminUser(ws.owner_user_id)) {
        shouldDeductCredits = false;
      }
    }
    const senderProfileId: string | null = (body as any).sender_profile_id || null;
    let resolvedSender: any = null;
    try {
      resolvedSender = await resolveSenderProfile(workspaceId, "whatsapp", senderProfileId);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || "Invalid sender profile" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const toCountry = countryFromE164(normalizedTo);
    const deductAmount = shouldDeductCredits ? await getDeductionAmount("whatsapp", toCountry) : 0;
    if (shouldDeductCredits) {
      const creditResult = await deductCredit(workspaceId, "whatsapp", undefined, callerUserId, deductAmount);
      if (!creditResult.allowed) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient WhatsApp credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const platformAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
    const platformPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

    const creds = await resolveMetaCredentials(adminClient, workspaceId, {
      access_token: platformAccessToken,
      phone_number_id: platformPhoneNumberId,
    });

    if (creds.source === "none" || !creds.config.access_token || !creds.config.phone_number_id) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured. Contact platform admin or set up your own in Settings → Channels." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 24h re-engagement window check.
    // WhatsApp Cloud API ONLY allows free-form text when the recipient has
    // messaged your business in the last 24h. Outside that window the only
    // way to reach them is an APPROVED template (not free text, not the
    // generic Meta `hello_world` placeholder which would deliver "Hello
    // World" instead of the user's content — confusing recipients and
    // hiding delivery failures from the sender).
    //
    // Behavior:
    //   • caller provided a template          → send the template
    //   • free-form msg + window OPEN         → send the text
    //   • free-form msg + window CLOSED       → fail fast with a structured
    //                                           `fallback:true` signal so
    //                                           callers (campaign /
    //                                           automation / inbox) can
    //                                           switch to SMS / Email /
    //                                           prompt the user to pick an
    //                                           approved template.
    let effectiveTemplate: TemplatePayload | undefined = template;
    let autoTemplated = false;

    if (!template && msgBody) {
      const windowOpen = await isWindowOpen(adminClient, workspaceId, normalizedTo);
      if (!windowOpen) {
        // Try to auto-recover via the workspace's default re-engagement
        // template — but ALWAYS resolve it live against Meta first
        // (HubSpot / GHL / Wati pattern) so we don't send a stale name/lang.
        const { data: waSettingsRows } = await adminClient
          .from("whatsapp_settings")
          .select("default_reengagement_template_id, is_active, updated_at")
          .eq("workspace_id", workspaceId)
          .order("is_active", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1);
        const defaultTplId = waSettingsRows?.[0]?.default_reengagement_template_id;

        let defaultTpl:
          | { name: string; language: string; variable_count: number; components: any[] | null }
          | null = null;
        if (defaultTplId) {
          const { data: tpl } = await adminClient
            .from("whatsapp_templates")
            .select("name, language, variable_count, status, components")
            .eq("id", defaultTplId)
            .eq("workspace_id", workspaceId)
            .maybeSingle();
          if (tpl && tpl.status === "approved") defaultTpl = tpl as any;
        }

        // Live-resolve against Meta so language/status/components are current.
        let live: { name: string; language: string; components: any[] | null } | null = null;
        if (defaultTpl) {
          live = await resolveLiveTemplate(
            adminClient,
            workspaceId,
            creds.config.access_token.trim(),
            creds.config.phone_number_id.trim(),
            defaultTpl.name,
            defaultTpl.language,
          );
        }

        if (live) {
          autoTemplated = true;
          const safeBody = msgBody
            .replace(/[\r\n\t]+/g, " ")
            .replace(/\s{4,}/g, "   ")
            .slice(0, 1024);
          const components: any[] = [];
          if ((defaultTpl?.variable_count ?? 0) > 0) {
            components.push({ type: "body", parameters: [{ type: "text", text: safeBody }] });
          }
          effectiveTemplate = {
            name: live.name,
            language: live.language,
            ...(components.length ? { components } : {}),
          };
          console.log("WA window closed — auto-sending via live-resolved template", {
            workspaceId, template: live.name, language: live.language,
          });
        } else if (isPreview) {
          // Test-send from the editor: fall back to Meta's universal
          // `hello_world` so users get a clean credentials-verified signal
          // regardless of template/state (matches HubSpot/GHL "Send test").
          autoTemplated = true;
          effectiveTemplate = { name: "hello_world", language: "en_US" };
          console.log("WA test send — using hello_world credential probe", {
            workspaceId, to: normalizedTo,
          });
        } else {
          const errMsg = defaultTplId
            ? "WhatsApp template no longer exists (or isn't approved) on Meta. Sync templates in Settings → Channels → WhatsApp and pick a new default re-engagement template."
            : "WhatsApp 24h window closed — recipient has not messaged you in 24h. Configure a default re-engagement template in Settings → Channels, or send an approved template manually.";
          console.warn("WA window closed (no live template)", { workspaceId, to: normalizedTo });

          await adminClient.from("whatsapp_messages").insert({
            workspace_id: workspaceId,
            direction: "outbound",
            phone_number: normalizedTo,
            message_type: "text",
            body: msgBody,
            status: "failed",
            error: errMsg,
            ...(leadId ? { lead_id: leadId } : {}),
          });

          if (campaignId && leadId) {
            await adminClient.from("campaign_messages")
              .update({ delivery_status: "failed", error: errMsg })
              .eq("campaign_id", campaignId)
              .eq("lead_id", leadId)
              .eq("channel", "whatsapp")
              .eq("delivery_status", "pending");
          }

          return new Response(JSON.stringify({
            success: false,
            fallback: true,
            reason: defaultTplId ? "template_unavailable" : "window_closed",
            error: errMsg,
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    let attempt = await sendWhatsAppMessage(
      creds.config.access_token.trim(),
      creds.config.phone_number_id.trim(),
      normalizedTo,
      msgBody || `[Template: ${effectiveTemplate?.name}]`,
      creds.source === "workspace" ? "workspace" : "platform",
      effectiveTemplate,
    );

    // Live-resolve retry on 132001 for caller-supplied templates that skipped
    // the block above (e.g. campaign-picked template). hello_world is the
    // universal fallback for a preview when even live resolution fails.
    if (!attempt.ok && effectiveTemplate) {
      const graphCode = Number(attempt.data?.error?.code ?? 0);
      if (graphCode === 132001) {
        const live = await resolveLiveTemplate(
          adminClient,
          workspaceId,
          creds.config.access_token.trim(),
          creds.config.phone_number_id.trim(),
          effectiveTemplate.name,
          effectiveTemplate.language,
        );
        if (live && (live.language !== effectiveTemplate.language)) {
          const retryTpl: TemplatePayload = { ...effectiveTemplate, language: live.language };
          const retry = await sendWhatsAppMessage(
            creds.config.access_token.trim(),
            creds.config.phone_number_id.trim(),
            normalizedTo,
            msgBody || `[Template: ${retryTpl.name}]`,
            creds.source === "workspace" ? "workspace" : "platform",
            retryTpl,
          );
          if (retry.ok) {
            attempt = retry;
            effectiveTemplate = retryTpl;
            console.log("WA template auto-corrected via live resolver", {
              workspaceId, template: retryTpl.name, language: live.language,
            });
          } else {
            attempt = retry;
          }
        }
        // Preview last-resort: hello_world credential probe.
        if (!attempt.ok && isPreview) {
          const probe = await sendWhatsAppMessage(
            creds.config.access_token.trim(),
            creds.config.phone_number_id.trim(),
            normalizedTo,
            `[Template: hello_world]`,
            creds.source === "workspace" ? "workspace" : "platform",
            { name: "hello_world", language: "en_US" },
          );
          if (probe.ok) {
            attempt = probe;
            effectiveTemplate = { name: "hello_world", language: "en_US" };
            autoTemplated = true;
          }
        }
      }
    }


    // NOTE: do NOT fall back from workspace → platform credentials.
    // The platform access token does not own the workspace's phone_number_id,
    // so any retry produces a misleading 100/33 "credentials mismatch" error.
    // Workspace creds are a paired unit (token + phone + WABA + templates) and
    // must surface their own failure so the user can fix it (e.g. sync/approve
    // the template in their WABA, or reconnect via Embedded Signup).

    if (!attempt.ok) {
      const { errMsg, graphCode, graphSubcode } = buildWhatsAppError(new Response(null, { status: 400 }), attempt.data);

      const logBody = msgBody || `[Template: ${effectiveTemplate?.name}]`;
      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId,
        direction: "outbound",
        phone_number: normalizedTo,
        message_type: effectiveTemplate ? "template" : type,
        body: logBody,
        status: "failed",
        error: errMsg,
        ...(leadId ? { lead_id: leadId } : {}),
      });

      // Alert workspace owner if this is a credential/auth failure (token invalid/expired, permissions)
      if (graphCode === 190 || graphCode === 200 || graphCode === 10 || isCredentialError("whatsapp", errMsg)) {
        await notifyCredentialFailure({
          workspaceId,
          channel: "whatsapp",
          errorMessage: errMsg,
          meta: { provider: "meta", source: "whatsapp-send", graphCode, graphSubcode },
        });
      }

      const isClientError = [190, 100, 10, 200, 131000, 131026, 131047, 131051].includes(graphCode) || graphCode === 0;
      return new Response(JSON.stringify({ success: false, error: errMsg, graphCode, graphSubcode }), { status: isClientError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const waMessageId = attempt.data?.messages?.[0]?.id || null;

    // Log the original message body even if auto-templated
    const sentLogBody = autoTemplated
      ? `${msgBody} [auto-sent as template: ${effectiveTemplate?.name}]`
      : (msgBody || `[Template: ${effectiveTemplate?.name}]`);

    await adminClient.from("whatsapp_messages").insert({
      workspace_id: workspaceId,
      wa_message_id: waMessageId,
      direction: "outbound",
      phone_number: normalizedTo,
      message_type: effectiveTemplate ? "template" : type,
      body: sentLogBody,
      status: "sent",
      auto_templated: autoTemplated,
      template_name: effectiveTemplate?.name || null,
      sender_profile_id: resolvedSender?.profile?.id || null,
      ...(leadId ? { lead_id: leadId } : {}),
    });
    if (!isPreview) {
      await logCommunicationUsage({
        workspaceId, channel: "whatsapp",
        senderProfileId: resolvedSender?.profile?.id || null,
        messageId: waMessageId, country: toCountry,
        creditsDeducted: deductAmount, status: "sent",
      });
    }

    if (campaignId && leadId && waMessageId) {
      await adminClient
        .from("campaign_messages")
        .update({ delivery_status: "delivered" })
        .eq("campaign_id", campaignId)
        .eq("lead_id", leadId)
        .eq("channel", "whatsapp")
        .eq("delivery_status", "pending");
    }

    const testMode = isPreview && effectiveTemplate?.name === "hello_world" ? "hello_world" : undefined;
    return new Response(JSON.stringify({ success: true, waMessageId, credentialSource: attempt.source, autoTemplated, templateUsed: effectiveTemplate?.name, testMode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Failed to send WhatsApp message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
