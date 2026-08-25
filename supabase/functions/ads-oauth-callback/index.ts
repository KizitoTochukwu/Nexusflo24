import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encryptMeta } from "../_shared/meta-crypto.ts";

const GRAPH = "https://graph.facebook.com/v22.0";
const FALLBACK = "https://nexusflo24.com";

function redirect(base: string, status: "success" | "error", detail?: string) {
  const url = new URL(base || FALLBACK);
  url.searchParams.set("connection", status);
  if (detail) url.searchParams.set("reason", detail);
  return Response.redirect(url.toString(), 302);
}

async function graphJson(url: URL) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Meta request failed (${response.status})`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const requestUrl = new URL(req.url);
  const state = requestUrl.searchParams.get("state") || "";
  const code = requestUrl.searchParams.get("code") || "";
  const providerError = requestUrl.searchParams.get("error_reason") || requestUrl.searchParams.get("error");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return redirect(FALLBACK, "error", "server_configuration");
  const admin = createClient(supabaseUrl, serviceKey);

  let returnTo = `${FALLBACK}/dashboard`;
  let workspaceId: string | null = null;
  let connectionId: string | null = null;

  try {
    if (!state) throw new Error("Missing OAuth state");
    const { data: stateRow, error: stateError } = await admin
      .from("oauth_connection_states")
      .select("id, workspace_id, user_id, provider, redirect_to, expires_at, used_at")
      .eq("state", state)
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow || stateRow.provider !== "meta") throw new Error("Invalid OAuth state");

    returnTo = stateRow.redirect_to;
    workspaceId = stateRow.workspace_id;
    if (stateRow.used_at) throw new Error("OAuth state has already been used");
    if (new Date(stateRow.expires_at).getTime() <= Date.now()) throw new Error("OAuth state has expired");

    const { data: consumed, error: consumeError } = await admin
      .from("oauth_connection_states")
      .update({ used_at: new Date().toISOString() })
      .eq("id", stateRow.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (consumeError || !consumed) throw new Error("OAuth state could not be consumed");
    if (providerError || !code) throw new Error(providerError || "Meta did not return an authorisation code");

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    const redirectUri = Deno.env.get("META_OAUTH_REDIRECT_URI");
    const encryptionKey = Deno.env.get("OAUTH_STATE_ENCRYPTION_KEY");
    if (!appId || !appSecret || !redirectUri || !encryptionKey) throw new Error("Meta OAuth configuration is incomplete");

    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
    const shortToken = await graphJson(tokenUrl);

    const longTokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    longTokenUrl.search = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken.access_token,
    }).toString();
    const tokenData = await graphJson(longTokenUrl);
    const accessToken = tokenData.access_token as string;
    if (!accessToken) throw new Error("Meta did not return an access token");

    const profileUrl = new URL(`${GRAPH}/me`);
    profileUrl.search = new URLSearchParams({ fields: "id,name", access_token: accessToken }).toString();
    const profile = await graphJson(profileUrl);

    const accountsUrl = new URL(`${GRAPH}/me/adaccounts`);
    accountsUrl.search = new URLSearchParams({
      fields: "id,account_id,name,currency,account_status",
      limit: "100",
      access_token: accessToken,
    }).toString();
    const accounts = await graphJson(accountsUrl);

    const expiresIn = Number(tokenData.expires_in || shortToken.expires_in || 0);
    const tokenExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const credentialsEncrypted = await encryptMeta(JSON.stringify({ access_token: accessToken }), encryptionKey);
    const scopes = ["ads_read", "leads_retrieval", "business_management", "pages_show_list", "pages_read_engagement", "instagram_basic"];

    const { data: connection, error: connectionError } = await admin.from("ad_connections").upsert({
      workspace_id: workspaceId,
      provider: "meta",
      status: "connected",
      business_name: profile.name || "Meta Business",
      external_business_id: profile.id || null,
      scopes,
      credentials_encrypted: credentialsEncrypted,
      token_expires_at: tokenExpiresAt,
      last_error: null,
      created_by: stateRow.user_id,
    }, { onConflict: "workspace_id,provider" }).select("id").maybeSingle();
    if (connectionError || !connection) throw connectionError || new Error("Could not save Meta connection");
    connectionId = connection.id;

    const accountRows = (Array.isArray(accounts.data) ? accounts.data : []).map((account: Record<string, unknown>) => ({
      workspace_id: workspaceId,
      connection_id: connection.id,
      provider: "meta",
      external_account_id: String(account.account_id || account.id || ""),
      name: String(account.name || account.account_id || "Meta Ad Account"),
      currency: String(account.currency || "USD"),
      status: Number(account.account_status) === 1 ? "active" : "inactive",
      is_enabled: true,
      is_demo: false,
      last_sync_at: new Date().toISOString(),
    })).filter((account: { external_account_id: string }) => account.external_account_id.length > 0);

    if (accountRows.length > 0) {
      const { error: accountsError } = await admin.from("ad_accounts").upsert(accountRows, {
        onConflict: "workspace_id,provider,external_account_id",
      });
      if (accountsError) throw accountsError;
    }

    await admin.from("ad_sync_logs").insert({
      workspace_id: workspaceId,
      connection_id: connection.id,
      provider: "meta",
      status: "success",
      records_synced: accountRows.length,
      message: `Connected Meta and imported ${accountRows.length} ad account${accountRows.length === 1 ? "" : "s"}`,
      technical_details: { stage: "oauth_callback" },
      finished_at: new Date().toISOString(),
    });

    return redirect(returnTo, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Meta OAuth callback error";
    console.error("[ads-oauth-callback]", { workspace_id: workspaceId, error: message });
    if (workspaceId) {
      await admin.from("ad_connections").update({ status: "needs_attention", last_error: message }).eq("workspace_id", workspaceId).eq("provider", "meta");
      await admin.from("ad_sync_logs").insert({
        workspace_id: workspaceId,
        connection_id: connectionId,
        provider: "meta",
        status: "failed",
        message: "Meta connection failed",
        technical_details: { stage: "oauth_callback", error: message },
        finished_at: new Date().toISOString(),
      }).then(() => undefined).catch(() => undefined);
    }
    return redirect(returnTo, "error", "meta_oauth_failed");
  }
});
