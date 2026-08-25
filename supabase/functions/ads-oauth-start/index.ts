import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const PROVIDERS = ["meta", "google", "linkedin"] as const;
const META_SCOPES = [
  "ads_read",
  "leads_retrieval",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
];

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  provider: z.enum(PROVIDERS),
  redirect_to: z.string().url().max(2048),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeRedirect(value: string, workspaceId: string): string | null {
  try {
    const url = new URL(value);
    const allowedHosts = new Set([
      "nexusflo24.com",
      "www.nexusflo24.com",
      "nexusflo24.lovable.app",
      "id-preview--83abe329-97fa-4834-9de4-67adac397517.lovable.app",
    ]);
    const expectedPath = `/dashboard/${workspaceId}/ads/accounts`;
    return url.protocol === "https:" && allowedHosts.has(url.hostname) && url.pathname === expectedPath
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function createState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let workspaceId: string | null = null;
  let provider: string | null = null;
  let admin: ReturnType<typeof createClient> | null = null;

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors, code: "INVALID_REQUEST" }, 400);
    workspaceId = parsed.data.workspace_id;
    provider = parsed.data.provider;

    const redirectTo = safeRedirect(parsed.data.redirect_to, workspaceId);
    if (!redirectTo) return json({ error: "Invalid Ads Hub return URL", code: "INVALID_REDIRECT" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Backend environment is incomplete");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (claimsError || typeof userId !== "string") return json({ error: "Invalid session", code: "INVALID_SESSION" }, 401);

    admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: adminError } = await admin.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (adminError) throw adminError;
    if (isAdmin !== true) return json({ error: "Only workspace owners and admins can connect ad accounts", code: "FORBIDDEN" }, 403);

    if (provider !== "meta") {
      return json({
        error: `${provider[0].toUpperCase()}${provider.slice(1)} Ads connection is not configured yet`,
        code: "PROVIDER_NOT_CONFIGURED",
      }, 501);
    }

    const appId = Deno.env.get("META_APP_ID");
    const redirectUri = Deno.env.get("META_OAUTH_REDIRECT_URI");
    const encryptionKey = Deno.env.get("OAUTH_STATE_ENCRYPTION_KEY");
    if (!appId || !redirectUri || !encryptionKey) {
      return json({ error: "Meta connection setup is incomplete", code: "META_NOT_CONFIGURED" }, 503);
    }

    const state = createState();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error: stateError } = await admin.from("oauth_connection_states").insert({
      state,
      workspace_id: workspaceId,
      provider,
      user_id: userId,
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (stateError) throw stateError;

    const authorizeUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
    authorizeUrl.search = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: META_SCOPES.join(","),
    }).toString();

    return json({ authorize_url: authorizeUrl.toString(), message: "Redirecting to Meta", configured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OAuth start error";
    console.error("[ads-oauth-start]", { workspace_id: workspaceId, provider, error: message });
    if (admin && workspaceId && provider && PROVIDERS.includes(provider as typeof PROVIDERS[number])) {
      await admin.from("ad_sync_logs").insert({
        workspace_id: workspaceId,
        provider,
        status: "failed",
        message: "Could not start advertising account connection",
        technical_details: { stage: "oauth_start", error: message },
        finished_at: new Date().toISOString(),
      }).then(() => undefined).catch(() => undefined);
    }
    return json({ error: "Could not start the advertising connection", code: "OAUTH_START_FAILED" }, 500);
  }
});
