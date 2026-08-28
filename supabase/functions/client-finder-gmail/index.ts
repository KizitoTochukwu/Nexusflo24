// AI Client Finder — Gmail mailbox connection via Lovable's App User Connector.
// Each workspace member connects their own Gmail account; the gateway holds the
// provider tokens and this function only stores an encrypted per-user handle.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, cfCors, cfJson, checkEntitlement, requireMember } from "../_shared/client-finder.ts";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "../_shared/appUserConnector.ts";
import {
  deleteConnectionKeyForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "../_shared/appUserConnections.ts";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_mail";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

function clientKey(): string | null {
  return Deno.env.get("GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY") ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cfCors });

  const admin = adminClient();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return cfJson({ error: "Invalid JSON body" }, 400);
  }

  const workspaceId: string = body.workspace_id ?? "";
  const gate = await requireMember(req, admin, workspaceId);
  if (gate instanceof Response) return gate;
  const { userId } = gate;

  const action: string = body.action ?? "";
  const configured = !!clientKey();

  try {
    if (action === "status") {
      const key = configured ? await getConnectionKeyForUser(userId, CONNECTOR_ID) : null;
      return cfJson({ ok: true, configured, connected: !!key });
    }

    if (action === "start") {
      if (!configured) {
        return cfJson({
          error: "Gmail connection is not configured on this platform yet.",
          not_configured: true,
        }, 409);
      }
      const allowance = await checkEntitlement(admin, workspaceId, "mailboxes");
      if (allowance) return allowance;

      const origin = String(body.origin ?? "");
      if (!/^https?:\/\//.test(origin)) return cfJson({ error: "A valid app address is required." }, 400);
      const returnUrl = new URL("/oauth/gmail/return", origin).toString();

      const existing = await getConnectionKeyForUser(userId, CONNECTOR_ID);
      const { authorizationUrl } = await authorizeAppUserOAuth({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectorId: CONNECTOR_ID,
        appUserId: userId,
        clientAPIKey: clientKey()!,
        returnUrl,
        connectionAPIKey: existing ?? undefined,
        credentialsConfiguration: { scopes: GOOGLE_SCOPES },
      });
      return cfJson({ ok: true, authorization_url: authorizationUrl });
    }

    if (action === "complete") {
      const code = String(body.code ?? "");
      if (!code) return cfJson({ error: "The connection response was incomplete." }, 400);

      const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
      if (connectorId !== CONNECTOR_ID) {
        return cfJson({ error: "The connection returned the wrong provider." }, 400);
      }
      await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey);

      // Read the mailbox address from Google itself, never from client input.
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: "/gmail/v1/users/me/profile",
      });
      if (!res.ok) {
        const detail = await res.text();
        return cfJson({ error: `Gmail rejected the first request (${res.status}): ${detail.slice(0, 200)}` }, 502);
      }
      const profile = await res.json();
      const email = String(profile.emailAddress ?? "").toLowerCase();
      if (!email) return cfJson({ error: "Gmail did not return a mailbox address." }, 502);

      const { error } = await admin.from("prospecting_mailboxes").upsert({
        workspace_id: workspaceId, created_by: userId, provider: "google", email,
        display_name: email, status: "connected", last_error: null,
        access_token: null, refresh_token: null, token_expires_at: null,
        scopes: GOOGLE_SCOPES, connected_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(), archived_at: null,
      }, { onConflict: "workspace_id,provider,email" });
      if (error) return cfJson({ error: error.message }, 500);

      await admin.from("prospecting_audit_events").insert({
        workspace_id: workspaceId, user_id: userId, action: "mailbox_connected",
        entity_type: "mailbox", detail: { provider: "google", email, via: "app_user_connector" },
      });
      return cfJson({ ok: true, email });
    }

    if (action === "disconnect") {
      const id = String(body.mailbox_id ?? "");
      const { data: mailbox } = await admin
        .from("prospecting_mailboxes").select("id, email, created_by")
        .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
      if (!mailbox) return cfJson({ error: "Mailbox not found." }, 404);
      if (mailbox.created_by !== userId) {
        return cfJson({ error: "Only the person who connected this mailbox can disconnect it." }, 403);
      }

      const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
      if (key) {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR_ID,
        });
        await deleteConnectionKeyForUser(userId, CONNECTOR_ID);
      }

      await admin.from("prospecting_mailboxes").update({
        status: "disconnected", archived_at: new Date().toISOString(),
      }).eq("id", id);

      const { data: paused } = await admin.from("prospecting_campaigns")
        .update({
          status: "paused", paused_at: new Date().toISOString(),
          paused_reason: `Paused: the sending mailbox ${mailbox.email} was disconnected.`,
        })
        .eq("workspace_id", workspaceId).eq("mailbox_id", id).eq("status", "active")
        .select("id");

      await admin.from("prospecting_audit_events").insert({
        workspace_id: workspaceId, user_id: userId, action: "mailbox_disconnected",
        entity_type: "mailbox", entity_id: id,
        detail: { email: mailbox.email, campaigns_paused: (paused ?? []).length },
      });
      return cfJson({ ok: true, campaigns_paused: (paused ?? []).length });
    }

    return cfJson({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return cfJson({ error: (e as Error).message }, 500);
  }
});
