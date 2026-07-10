// WhatsApp Meta Embedded Signup — exchanges the short-lived OAuth code for a
// business system-user token, subscribes our app to the WABA so inbound webhooks
// flow, registers the phone number with WhatsApp Cloud API, and persists the
// connection in both `whatsapp_settings` (rich metadata + verify token) and
// `workspace_channel_settings` (so resolveChannelCredentials() picks it up).
//
// Triggered by the frontend `WhatsAppConnectCard` after FB.login() succeeds.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptWhatsApp, encryptChannelConfig } from "../_shared/whatsapp-crypto.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH = "https://graph.facebook.com/v21.0";

interface Body {
  workspaceId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  redirectUri?: string;
}

async function graph<T = any>(
  path: string,
  init: RequestInit & { token?: string; query?: Record<string, string> } = {},
): Promise<T> {
  const { token, query, ...rest } = init;
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const res = await fetch(`${GRAPH}${path}${qs}`, {
    ...rest,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Graph ${res.status} on ${path}`;
    throw new Error(msg);
  }
  return data as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    const whatsappKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    const channelKey = Deno.env.get("CHANNEL_SETTINGS_ENCRYPTION_KEY");
    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "Server not configured: META_APP_ID / META_APP_SECRET missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!whatsappKey || !channelKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured: encryption keys missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as Body;
    let { workspaceId, code, wabaId, phoneNumberId } = body || ({} as Body);

    if (!workspaceId || !code) {
      return new Response(
        JSON.stringify({ error: "workspaceId and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is workspace admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await admin.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only workspace admins can connect WhatsApp" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Exchange short-lived code for a business system-user access token.
    // The Facebook JS SDK's FB.login() binds the code to its own internal
    // redirect — passing redirect_uri here would cause Meta to reject the
    // exchange with "redirect_uri is not identical". Omit it entirely.
    console.info("[Meta Embedded Signup] exchanging code (no redirect_uri)");
    const exchangeUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    }).toString()}`;
    const exchangeRes = await fetch(exchangeUrl, { headers: { "Content-Type": "application/json" } });
    const tokenRes = await exchangeRes.json().catch(() => ({})) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string; type?: string; code?: number; error_subcode?: number };
    };
    console.info("[Meta Embedded Signup] Meta code exchange response:", {
      ok: exchangeRes.ok,
      status: exchangeRes.status,
      token_type: tokenRes.token_type,
      expires_in: tokenRes.expires_in ?? null,
      error: tokenRes.error
        ? {
            message: tokenRes.error.message,
            type: tokenRes.error.type,
            code: tokenRes.error.code,
            error_subcode: tokenRes.error.error_subcode,
          }
        : null,
    });
    if (!exchangeRes.ok || !tokenRes.access_token) {
      throw new Error(
        tokenRes.error?.message || `Meta code exchange failed with status ${exchangeRes.status}`,
      );
    }
    const accessToken = tokenRes.access_token;
    const tokenExpiresAt = tokenRes.expires_in
      ? new Date(Date.now() + tokenRes.expires_in * 1000).toISOString()
      : null;

    // 1b. If Meta's postMessage didn't return waba_id / phone_number_id,
    //     recover them from the granted token via /debug_token + /phone_numbers.
    if (!wabaId || !phoneNumberId) {
      try {
        const debug = await graph<{
          data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }> };
        }>("/debug_token", {
          method: "GET",
          query: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`,
          },
        });
        const scopes = debug?.data?.granular_scopes || [];
        const wabaScope = scopes.find(
          (s) =>
            s.scope === "whatsapp_business_management" ||
            s.scope === "whatsapp_business_messaging",
        );
        const recoveredWabaId = wabaScope?.target_ids?.[0];
        if (!wabaId && recoveredWabaId) wabaId = recoveredWabaId;
      } catch (err) {
        console.warn("debug_token recovery failed:", (err as Error).message);
      }

      if (wabaId && !phoneNumberId) {
        try {
          const phones = await graph<{ data?: Array<{ id: string }> }>(
            `/${encodeURIComponent(wabaId)}/phone_numbers`,
            {
              method: "GET",
              token: accessToken,
              query: { fields: "id,display_phone_number,verified_name" },
            },
          );
          const firstPhone = phones?.data?.[0]?.id;
          if (firstPhone) phoneNumberId = firstPhone;
        } catch (err) {
          console.warn("phone_numbers recovery failed:", (err as Error).message);
        }
      }

      if (!wabaId || !phoneNumberId) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Meta didn't return your WhatsApp Business Account or phone number. Reopen Connect, complete every step of the popup (Business → WABA → Phone number), and make sure popups/cookies are allowed for this site.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Subscribe our app to the WABA (required for inbound webhooks).
    try {
      await graph(`/${encodeURIComponent(wabaId)}/subscribed_apps`, {
        method: "POST",
        token: accessToken,
      });
    } catch (err) {
      console.warn("subscribed_apps failed (may already be subscribed):", (err as Error).message);
    }

    // 3. Register the phone number with Cloud API (required before sending).
    //    Use a deterministic PIN; user can change later via Meta UI.
    const pin = "123456";
    try {
      await graph(`/${encodeURIComponent(phoneNumberId)}/register`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });
    } catch (err) {
      // Already registered or 2FA enabled — non-fatal, log and continue.
      console.warn("phone /register failed (likely already registered):", (err as Error).message);
    }

    // 4. Fetch phone number metadata for display.
    let displayPhone = "";
    let verifiedName = "";
    try {
      const phoneInfo = await graph<{ display_phone_number?: string; verified_name?: string }>(
        `/${encodeURIComponent(phoneNumberId)}`,
        {
          method: "GET",
          token: accessToken,
          query: { fields: "display_phone_number,verified_name" },
        },
      );
      displayPhone = phoneInfo.display_phone_number || "";
      verifiedName = phoneInfo.verified_name || "";
    } catch (err) {
      console.warn("phone fields fetch failed:", (err as Error).message);
    }

    // 5. Fetch WABA business name.
    let businessName = "";
    try {
      const wabaInfo = await graph<{ name?: string }>(`/${encodeURIComponent(wabaId)}`, {
        method: "GET",
        token: accessToken,
        query: { fields: "name" },
      });
      businessName = wabaInfo.name || "";
    } catch {
      /* ignore */
    }

    // 6. Persist to whatsapp_settings.
    const accessTokenEncrypted = await encryptWhatsApp(accessToken, whatsappKey);
    const verifyToken = crypto.randomUUID().replace(/-/g, "");
    const verifyTokenEncrypted = await encryptWhatsApp(verifyToken, whatsappKey);

    const { error: upsertErr } = await admin
      .from("whatsapp_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          phone_number_id: phoneNumberId,
          access_token_encrypted: accessTokenEncrypted,
          verify_token_encrypted: verifyTokenEncrypted,
          is_active: true,
          waba_id: wabaId,
          display_phone_number: displayPhone,
          verified_name: verifiedName,
          business_account_name: businessName,
          token_expires_at: tokenExpiresAt,
          connection_method: "embedded_signup",
        },
        { onConflict: "workspace_id" },
      );
    if (upsertErr) {
      // workspace_id may not have a unique constraint; fall back to update-or-insert.
      const { data: existing } = await admin
        .from("whatsapp_settings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (existing?.id) {
        await admin
          .from("whatsapp_settings")
          .update({
            phone_number_id: phoneNumberId,
            access_token_encrypted: accessTokenEncrypted,
            verify_token_encrypted: verifyTokenEncrypted,
            is_active: true,
            waba_id: wabaId,
            display_phone_number: displayPhone,
            verified_name: verifiedName,
            business_account_name: businessName,
            token_expires_at: tokenExpiresAt,
            connection_method: "embedded_signup",
          })
          .eq("id", existing.id);
      } else {
        await admin.from("whatsapp_settings").insert({
          workspace_id: workspaceId,
          phone_number_id: phoneNumberId,
          access_token_encrypted: accessTokenEncrypted,
          verify_token_encrypted: verifyTokenEncrypted,
          is_active: true,
          waba_id: wabaId,
          display_phone_number: displayPhone,
          verified_name: verifiedName,
          business_account_name: businessName,
          token_expires_at: tokenExpiresAt,
          connection_method: "embedded_signup",
        });
      }
    }

    // 7. Also mirror into workspace_channel_settings so the existing
    //    resolveChannelCredentials() helper used by whatsapp-send picks it up.
    const channelConfigEncrypted = await encryptChannelConfig(
      JSON.stringify({ provider: "meta", phone_number_id: phoneNumberId, access_token: accessToken }),
      channelKey,
    );
    const { data: existingChannel } = await admin
      .from("workspace_channel_settings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("channel", "whatsapp")
      .eq("provider", "meta")
      .maybeSingle();
    if (existingChannel?.id) {
      await admin
        .from("workspace_channel_settings")
        .update({
          config_encrypted: channelConfigEncrypted,
          is_active: true,
          provider: "meta",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingChannel.id);
    } else {
      await admin.from("workspace_channel_settings").insert({
        workspace_id: workspaceId,
        channel: "whatsapp",
        config_encrypted: channelConfigEncrypted,
        is_active: true,
        provider: "meta",
      });
    }

    // 8. Fire-and-forget initial template sync.
    try {
      fetch(`${supabaseUrl}/functions/v1/whatsapp-sync-templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ workspaceId }),
      }).catch((e) => console.warn("template sync dispatch failed:", e));
    } catch {
      /* ignore */
    }

    return new Response(
      JSON.stringify({
        success: true,
        wabaId,
        phoneNumberId,
        displayPhoneNumber: displayPhone,
        verifiedName,
        businessAccountName: businessName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-embedded-signup error:", err);
    const message = err instanceof Error ? err.message : "Connection failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
