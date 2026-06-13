// WhatsApp Meta Embedded Signup — exchanges the short-lived OAuth code for a
// business system-user token, subscribes our app to the WABA so inbound webhooks
// flow, registers the phone number with WhatsApp Cloud API, and persists the
// connection in whatsapp_settings, whatsapp_accounts, sender_profiles, and
// workspace_channel_settings.
//
// Embedded Signup uses config_id; we DO NOT send a redirect_uri at code
// exchange time. Meta uses the redirect bound to the configuration.

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
  wabaId?: string;
  phoneNumberId?: string;
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
    wabaId = wabaId || "";
    phoneNumberId = phoneNumberId || "";

    console.info("[Meta Embedded Signup] incoming:", {
      workspaceId,
      codeLen: code?.length || 0,
      wabaId: wabaId || null,
      phoneNumberId: phoneNumberId || null,
      redirect_uri_used: null,
    });

    if (!workspaceId || !code) {
      return new Response(
        JSON.stringify({ error: "workspaceId and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // 1. Exchange short-lived code for an access token.
    // With config_id-based Embedded Signup we do NOT send redirect_uri.
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
    console.info("[Meta Embedded Signup] code exchange response:", {
      ok: exchangeRes.ok,
      status: exchangeRes.status,
      token_type: tokenRes.token_type,
      expires_in: tokenRes.expires_in ?? null,
      error: tokenRes.error || null,
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

    // 1b. Recover wabaId / phoneNumberId from token if postMessage didn't provide them.
    if (!wabaId || !phoneNumberId) {
      try {
        const debug = await graph<{
          data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }> };
        }>("/debug_token", {
          method: "GET",
          query: { input_token: accessToken, access_token: `${appId}|${appSecret}` },
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
        console.warn("[Meta Embedded Signup] debug_token recovery failed:", (err as Error).message);
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
          console.warn("[Meta Embedded Signup] phone_numbers recovery failed:", (err as Error).message);
        }
      }

      if (!wabaId || !phoneNumberId) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Meta didn't return your WhatsApp Business Account or phone number. Reopen Connect, complete every step (Business → WABA → Phone number), and make sure popups/cookies are allowed.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.info("[Meta Embedded Signup] resolved IDs:", { wabaId, phoneNumberId });

    // 2. Subscribe our app to the WABA.
    try {
      await graph(`/${encodeURIComponent(wabaId)}/subscribed_apps`, {
        method: "POST",
        token: accessToken,
      });
    } catch (err) {
      console.warn("[Meta Embedded Signup] subscribed_apps failed:", (err as Error).message);
    }

    // 3. Register the phone number with Cloud API.
    const pin = "123456";
    try {
      await graph(`/${encodeURIComponent(phoneNumberId)}/register`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });
    } catch (err) {
      console.warn("[Meta Embedded Signup] phone /register failed:", (err as Error).message);
    }

    // 4. Phone metadata.
    let displayPhone = "";
    let verifiedName = "";
    let verificationStatus = "";
    try {
      const phoneInfo = await graph<{
        display_phone_number?: string;
        verified_name?: string;
        code_verification_status?: string;
      }>(`/${encodeURIComponent(phoneNumberId)}`, {
        method: "GET",
        token: accessToken,
        query: { fields: "display_phone_number,verified_name,code_verification_status" },
      });
      displayPhone = phoneInfo.display_phone_number || "";
      verifiedName = phoneInfo.verified_name || "";
      verificationStatus = phoneInfo.code_verification_status || "";
    } catch (err) {
      console.warn("[Meta Embedded Signup] phone fields fetch failed:", (err as Error).message);
    }

    // 5. WABA business name.
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

    console.info("[Meta Embedded Signup] metadata:", {
      displayPhone,
      verifiedName,
      businessName,
      verificationStatus,
    });

    // 6. whatsapp_settings (encrypted token + verify token).
    const accessTokenEncrypted = await encryptWhatsApp(accessToken, whatsappKey);
    const verifyToken = crypto.randomUUID().replace(/-/g, "");
    const verifyTokenEncrypted = await encryptWhatsApp(verifyToken, whatsappKey);

    const settingsRow = {
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
    };

    const { error: upsertErr } = await admin
      .from("whatsapp_settings")
      .upsert(settingsRow, { onConflict: "workspace_id" });
    if (upsertErr) {
      const { data: existing } = await admin
        .from("whatsapp_settings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("whatsapp_settings").update(settingsRow).eq("id", existing.id);
      } else {
        await admin.from("whatsapp_settings").insert(settingsRow);
      }
    }

    // 6b. whatsapp_accounts canonical workspace record.
    const accountRow = {
      workspace_id: workspaceId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhone,
      verified_name: verifiedName,
      business_name: businessName,
      verification_status: verificationStatus,
      connection_method: "embedded_signup",
      connected_by: userId,
      connected_at: new Date().toISOString(),
    };
    const { error: accountErr } = await admin
      .from("whatsapp_accounts")
      .upsert(accountRow, { onConflict: "workspace_id" });
    if (accountErr) {
      console.warn("[Meta Embedded Signup] whatsapp_accounts upsert failed:", accountErr.message);
    }

    // 6c. sender_profiles (+ whatsapp_senders detail).
    try {
      const senderLabel = verifiedName || displayPhone || "WhatsApp";
      const { data: existingSender } = await admin
        .from("sender_profiles")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .eq("address", displayPhone || phoneNumberId)
        .maybeSingle();

      let senderProfileId = existingSender?.id as string | undefined;
      if (senderProfileId) {
        await admin
          .from("sender_profiles")
          .update({
            label: senderLabel,
            display_name: verifiedName || senderLabel,
            address: displayPhone || phoneNumberId,
            status: "active",
            is_default: true,
          })
          .eq("id", senderProfileId);
      } else {
        const { data: inserted, error: senderErr } = await admin
          .from("sender_profiles")
          .insert({
            workspace_id: workspaceId,
            channel: "whatsapp",
            label: senderLabel,
            display_name: verifiedName || senderLabel,
            address: displayPhone || phoneNumberId,
            status: "active",
            is_default: true,
          })
          .select("id")
          .single();
        if (senderErr) throw senderErr;
        senderProfileId = inserted.id;
      }

      // Clear other defaults for this workspace's WhatsApp channel.
      await admin
        .from("sender_profiles")
        .update({ is_default: false })
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .neq("id", senderProfileId!);

      // Detail row.
      await admin
        .from("whatsapp_senders")
        .upsert(
          {
            sender_profile_id: senderProfileId!,
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
            display_phone_number: displayPhone,
            verified_name: verifiedName,
          },
          { onConflict: "sender_profile_id" },
        );
    } catch (senderErr) {
      console.warn("[Meta Embedded Signup] sender_profiles upsert failed:", (senderErr as Error).message);
    }

    // 7. workspace_channel_settings mirror for resolveChannelCredentials().
    const channelConfigEncrypted = await encryptChannelConfig(
      JSON.stringify({ phone_number_id: phoneNumberId, access_token: accessToken }),
      channelKey,
    );
    const { data: existingChannel } = await admin
      .from("workspace_channel_settings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("channel", "whatsapp")
      .maybeSingle();
    if (existingChannel?.id) {
      await admin
        .from("workspace_channel_settings")
        .update({ config_encrypted: channelConfigEncrypted, is_active: true })
        .eq("id", existingChannel.id);
    } else {
      await admin.from("workspace_channel_settings").insert({
        workspace_id: workspaceId,
        channel: "whatsapp",
        config_encrypted: channelConfigEncrypted,
        is_active: true,
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
        verificationStatus,
        redirectUriUsed: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[Meta Embedded Signup] error:", err);
    const message = err instanceof Error ? err.message : "Connection failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
