import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelCredentials } from "../_shared/channel-credentials.ts";
import { decryptWhatsApp, encryptChannelConfig } from "../_shared/whatsapp-crypto.ts";
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";
import { htmlToPlainText } from "../_shared/htmlToPlainText.ts";
import { normalizePhoneE164 as normalizePhone } from "../_shared/phone.ts";
import { isCredentialError, notifyCredentialFailure } from "../_shared/credential-alert.ts";
import { resolveSenderProfile } from "../_shared/sender-resolver.ts";
import { logCommunicationUsage, getDeductionAmount, countryFromE164 } from "../_shared/usage-logger.ts";
import { enforceWaPacing, checkDailyTier } from "../_shared/wa-rate-limit.ts";

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
    .eq("provider", "meta")
    .maybeSingle();

  if (existing?.id) {
    await adminClient
      .from("workspace_channel_settings")
      .update({ config_encrypted: configEncrypted, is_active: true, provider: "meta", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await adminClient.from("workspace_channel_settings").insert({
      workspace_id: workspaceId,
      channel: "whatsapp",
      config_encrypted: configEncrypted,
      is_active: true,
      provider: "meta",
    });
  }
}

async function resolveMetaCredentials(
  adminClient: any,
  workspaceId: string,
  platformFallback: Record<string, string | undefined>,
) {
  const workspaceCreds = await resolveChannelCredentials(workspaceId, "whatsapp", {});
  const workspaceProvider = String(workspaceCreds.config.provider || "meta").toLowerCase();
  if (workspaceProvider === "meta" && hasMetaCredentials(workspaceCreds.config)) return workspaceCreds;

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

/** Count distinct {{n}} placeholders in a template text fragment. */
function countPlaceholders(text: unknown): number {
  const matches = String(text ?? "").match(/\{\{\s*\d+\s*\}\}/g);
  if (!matches) return 0;
  return new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
}

function findComponent(components: any[] | null | undefined, type: string): any | null {
  return (components || []).find((c: any) => String(c?.type || "").toUpperCase() === type) || null;
}

/**
 * Meta rejects a template send with 131008 / 132000 when the number of
 * supplied parameters does not exactly match the number of {{n}} placeholders
 * in the APPROVED template. This reconciles a caller-supplied (or
 * auto-generated) component array against the LIVE template definition:
 * missing parameters are padded with the supplied fallback text, extras are
 * dropped, and components the template doesn't declare are removed.
 */
function reconcileTemplateComponents(
  liveComponents: any[] | null,
  suppliedComponents: any[] | null | undefined,
  fallbackText: string,
): any[] {
  const safeFallback = (fallbackText || " ").replace(/[\r\n\t]+/g, " ").slice(0, 1024) || " ";
  const out: any[] = [];

  const supplied = Array.isArray(suppliedComponents) ? suppliedComponents : [];
  const suppliedFor = (type: string) =>
    supplied.find((c: any) => String(c?.type || "").toUpperCase() === type.toUpperCase());

  // HEADER — only text headers can carry {{n}} variables.
  const liveHeader = findComponent(liveComponents, "HEADER");
  if (liveHeader && String(liveHeader.format || "TEXT").toUpperCase() === "TEXT") {
    const need = countPlaceholders(liveHeader.text);
    if (need > 0) {
      const given = (suppliedFor("header")?.parameters as any[]) || [];
      const params = [];
      for (let i = 0; i < need; i++) {
        const v = given[i]?.text ?? given[i]?.parameter_name ?? safeFallback;
        params.push({ type: "text", text: String(v || safeFallback).slice(0, 60) });
      }
      out.push({ type: "header", parameters: params });
    }
  }

  // BODY
  const liveBody = findComponent(liveComponents, "BODY");
  const bodyNeed = liveBody ? countPlaceholders(liveBody.text) : 0;
  if (bodyNeed > 0) {
    const given = (suppliedFor("body")?.parameters as any[]) || [];
    const params = [];
    for (let i = 0; i < bodyNeed; i++) {
      const v = given[i]?.text ?? safeFallback;
      params.push({ type: "text", text: String(v ?? safeFallback).slice(0, 1024) || " " });
    }
    out.push({ type: "body", parameters: params });
  }

  // BUTTONS — only URL buttons with a {{1}} suffix need a parameter.
  const liveButtons = findComponent(liveComponents, "BUTTONS");
  const buttons: any[] = liveButtons?.buttons || [];
  buttons.forEach((btn: any, index: number) => {
    const isDynamicUrl =
      String(btn?.type || "").toUpperCase() === "URL" && countPlaceholders(btn?.url) > 0;
    if (!isDynamicUrl) return;
    const givenBtn = supplied.find(
      (c: any) => String(c?.type || "").toLowerCase() === "button" && Number(c?.index) === index,
    );
    const v = (givenBtn?.parameters as any[])?.[0]?.text ?? safeFallback;
    out.push({
      type: "button",
      sub_type: "url",
      index: String(index),
      parameters: [{ type: "text", text: String(v || safeFallback).slice(0, 1024) }],
    });
  });

  return out;
}

/**
 * When the configured default re-engagement template is gone from Meta, fall
 * back to any other locally-known approved template that still live-resolves,
 * and persist it as the new default so the workspace self-heals.
 */
async function findAnyLiveTemplate(
  adminClient: any,
  workspaceId: string,
  accessToken: string,
  phoneNumberId: string,
  excludeName?: string,
): Promise<{ name: string; language: string; components: any[] | null; templateId?: string } | null> {
  const { data: rows } = await adminClient
    .from("whatsapp_templates")
    .select("id, name, language, category, status, meta_template_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "approved")
    .not("meta_template_id", "is", null)
    .order("category", { ascending: true }) // AUTHENTICATION → MARKETING → UTILITY
    .limit(10);

  for (const row of rows || []) {
    if (excludeName && row.name === excludeName) continue;
    const live = await resolveLiveTemplate(
      adminClient,
      workspaceId,
      accessToken,
      phoneNumberId,
      row.name,
      row.language,
    );
    if (live) return { ...live, templateId: row.id };
  }
  return null;
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
      const adminClientEarly = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
      // Hydrate template by id if only id was passed (defence-in-depth).
      let tpl = (template as any) || null;
      if (tpl && !tpl.contentSid && tpl.id) {
        const { data: row } = await adminClientEarly
          .from("whatsapp_templates")
          .select("name, language, twilio_content_sid, variable_count, twilio_variable_sample")
          .eq("workspace_id", workspaceId)
          .eq("id", tpl.id)
          .maybeSingle();
        if (row?.twilio_content_sid) {
          tpl = {
            ...tpl,
            name: row.name,
            language: row.language,
            contentSid: row.twilio_content_sid,
            contentVariables: tpl.contentVariables || row.twilio_variable_sample || {},
          };
        }
      }

      // Business-initiated requires a template. Free-text is only allowed
      // when the 24h customer-window is open.
      if (!tpl?.contentSid && !isPreview) {
        const windowOpen = await hasRecentInboundMessage(adminClientEarly, workspaceId, normalizedTo);
        if (!windowOpen) {
          return new Response(
            JSON.stringify({
              success: false,
              provider: "twilio",
              reason: "no_template",
              error: "Business-initiated WhatsApp requires an approved template (Twilio Content SID). Free-text only delivers inside the 24-hour customer window.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      console.log("[whatsapp-send] routing to Twilio provider", {
        workspaceId,
        hasTemplate: !!tpl?.contentSid,
        templateSid: tpl?.contentSid ? `${String(tpl.contentSid).slice(0, 6)}…` : null,
      });
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
          contentSid: tpl?.contentSid,
          contentVariables: tpl?.contentVariables,
          sender_profile_id: (body as any).sender_profile_id,
          skipCredits,
          preview: isPreview,
        }),
      });
      const fwdData = await fwd.json().catch(() => ({}));
      if (!fwd.ok) {
        console.warn("[whatsapp-send] twilio forwarder returned non-2xx", {
          status: fwd.status,
          body: fwdData,
        });
      }
      const normalized = {
        provider: "twilio",
        ...(typeof fwdData === "object" && fwdData ? fwdData : {}),
      } as Record<string, unknown>;
      if (!fwd.ok && normalized.success === undefined) {
        normalized.success = false;
        if (!normalized.error) {
          normalized.error = `Twilio WhatsApp send failed (status ${fwd.status})`;
        }
      }
      return new Response(JSON.stringify(normalized), {
        status: 200,
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

    // Normalize a Meta-flavoured template payload: the picker sends
    // { id, name?, language?, contentVariables? } with no `components`.
    // Hydrate name/language from the DB when only the id is present, and
    // convert `contentVariables` ({"1":"Hi John",…}) into Meta's body
    // parameter array. Twilio-flavoured payloads (contentSid) are already
    // routed to the Twilio branch above.
    if (template) {
      const tplAny = template as any;
      if ((!tplAny.name || !tplAny.language) && tplAny.id) {
        const { data: row } = await adminClient
          .from("whatsapp_templates")
          .select("name, language, variable_count, components, status")
          .eq("workspace_id", workspaceId)
          .eq("id", tplAny.id)
          .maybeSingle();
        if (row) {
          tplAny.name = tplAny.name || row.name;
          tplAny.language = tplAny.language || row.language;
        }
      }
      if (!tplAny.components && tplAny.contentVariables && typeof tplAny.contentVariables === "object") {
        const entries = Object.entries(tplAny.contentVariables as Record<string, string>)
          .filter(([k]) => /^\d+$/.test(k))
          .sort((a, b) => Number(a[0]) - Number(b[0]));
        if (entries.length > 0) {
          tplAny.components = [
            { type: "body", parameters: entries.map(([, v]) => ({ type: "text", text: String(v ?? "") })) },
          ];
        }
      }
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

        // Self-heal: the configured default is gone from Meta (or none was
        // ever configured). Pick any other locally-known approved template
        // that still resolves live and promote it to the workspace default.
        if (!live) {
          const rescued = await findAnyLiveTemplate(
            adminClient,
            workspaceId,
            creds.config.access_token.trim(),
            creds.config.phone_number_id.trim(),
            defaultTpl?.name,
          );
          if (rescued) {
            live = rescued;
            console.log("WA default template unavailable — self-healed to", rescued.name);
            if (rescued.templateId) {
              await adminClient
                .from("whatsapp_settings")
                .update({
                  default_reengagement_template_id: rescued.templateId,
                  updated_at: new Date().toISOString(),
                })
                .eq("workspace_id", workspaceId);
            }
          }
        }

        if (live) {
          autoTemplated = true;
          const safeBody = msgBody
            .replace(/[\r\n\t]+/g, " ")
            .replace(/\s{4,}/g, "   ")
            .slice(0, 1024);
          // Build the parameter set from the LIVE definition so the count
          // always matches the approved template (avoids Meta 131008).
          const components = reconcileTemplateComponents(live.components, null, safeBody);
          effectiveTemplate = {
            name: live.name,
            language: live.language,
            ...(components.length ? { components } : {}),
          };
          console.log("WA window closed — auto-sending via live-resolved template", {
            workspaceId, template: live.name, language: live.language, params: components.length,
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

    // ── Parameter reconciliation for caller-supplied templates ──
    // Meta returns 131008 ("Required parameter is missing") whenever the
    // supplied parameter count differs from the approved template's {{n}}
    // placeholders. Resolve the template live and rebuild the component
    // array from the real definition before sending.
    if (effectiveTemplate && !autoTemplated && effectiveTemplate.name !== "hello_world") {
      try {
        const liveForCaller = await resolveLiveTemplate(
          adminClient,
          workspaceId,
          creds.config.access_token.trim(),
          creds.config.phone_number_id.trim(),
          effectiveTemplate.name,
          effectiveTemplate.language,
        );
        if (liveForCaller) {
          const reconciled = reconcileTemplateComponents(
            liveForCaller.components,
            effectiveTemplate.components as any[] | undefined,
            msgBody || "",
          );
          effectiveTemplate = {
            name: liveForCaller.name,
            language: liveForCaller.language,
            ...(reconciled.length ? { components: reconciled } : {}),
          };
          console.log("WA template reconciled against live definition", {
            template: liveForCaller.name,
            language: liveForCaller.language,
            components: reconciled.length,
          });
        }
      } catch (err) {
        console.warn("WA template reconciliation skipped:", err);
      }
    }



    // ── Template category compliance (Meta MARKETING vs UTILITY vs AUTH) ──
    // MARKETING templates: require lead opt-in (or workspace assume_opt_in),
    //   and reject if the lead is on the opt-out list.
    // UTILITY / AUTHENTICATION: allowed for campaigns but tagged with a
    //   compliance_note so admins can audit misuse.
    let complianceNote: string | null = null;
    if (effectiveTemplate && !isPreview) {
      const { data: tplRow } = await adminClient
        .from("whatsapp_templates")
        .select("category")
        .eq("workspace_id", workspaceId)
        .eq("name", effectiveTemplate.name)
        .maybeSingle();
      const category = String(tplRow?.category || "MARKETING").toUpperCase();

      if (category === "MARKETING" && leadId) {
        const { data: lead } = await adminClient
          .from("leads")
          .select("tags, wa_opt_in_at")
          .eq("id", leadId)
          .maybeSingle();
        const tags: string[] = lead?.tags || [];
        const optedOut = tags.includes("unsubscribed") || tags.includes("wa_opted_out");
        if (optedOut) {
          const errMsg = "Recipient opted out of WhatsApp marketing.";
          await adminClient.from("whatsapp_messages").insert({
            workspace_id: workspaceId, direction: "outbound",
            phone_number: normalizedTo, message_type: "template",
            body: msgBody || `[Template: ${effectiveTemplate.name}]`,
            status: "failed", error: errMsg,
            template_name: effectiveTemplate.name,
            ...(leadId ? { lead_id: leadId } : {}),
            ...(campaignId ? { campaign_id: campaignId } : {}),
          });
          if (campaignId && leadId) {
            await adminClient.from("campaign_messages")
              .update({ delivery_status: "failed", error: errMsg })
              .eq("campaign_id", campaignId).eq("lead_id", leadId)
              .eq("channel", "whatsapp").eq("delivery_status", "pending");
          }
          return new Response(JSON.stringify({
            success: false, fallback: true, reason: "opted_out", error: errMsg,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: waSettings } = await adminClient
          .from("whatsapp_settings")
          .select("assume_opt_in")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        const optIn = Boolean(lead?.wa_opt_in_at) || Boolean(waSettings?.assume_opt_in);
        if (!optIn) {
          complianceNote = "MARKETING template sent without recorded opt-in — verify lead consent.";
        }
      } else if ((category === "UTILITY" || category === "AUTHENTICATION") && campaignId) {
        complianceNote = `${category} template used from a campaign — Meta may flag as misuse if not transactional.`;
      }
    }

    // Per-phone pacing + daily tier check (matches HubSpot/GHL WA-specific throttling).
    const tier = await checkDailyTier(adminClient, workspaceId);
    if (!tier.ok) {
      const errMsg = `WhatsApp 24h tier limit reached (${tier.used}/${tier.limit}). Wait or request a higher tier from Meta.`;
      await adminClient.from("whatsapp_messages").insert({
        workspace_id: workspaceId, direction: "outbound",
        phone_number: normalizedTo, message_type: effectiveTemplate ? "template" : type,
        body: msgBody || `[Template: ${effectiveTemplate?.name}]`,
        status: "failed", error: errMsg,
        ...(leadId ? { lead_id: leadId } : {}),
        ...(campaignId ? { campaign_id: campaignId } : {}),
      });
      return new Response(JSON.stringify({
        success: false, fallback: true, reason: "tier_exceeded", error: errMsg,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (tier.warn) {
      console.warn(`WA tier warning: ${tier.used}/${tier.limit} for workspace ${workspaceId}`);
    }
    await enforceWaPacing(creds.config.phone_number_id.trim());

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
        ...(campaignId ? { campaign_id: campaignId } : {}),
        ...(complianceNote ? { compliance_note: complianceNote } : {}),
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
      ...(campaignId ? { campaign_id: campaignId } : {}),
      ...(complianceNote ? { compliance_note: complianceNote } : {}),
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
