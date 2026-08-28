// AI Client Finder — connected sending mailboxes.
// Google/Microsoft OAuth is only offered when the platform has credentials for it.
// Until a mailbox is connected, sending falls back to the verified workspace sender.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, cfCors, cfJson, requireMember } from "../_shared/client-finder.ts";
import { isValidEmail } from "../_shared/client-finder-send.ts";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];
const MS_SCOPES = ["offline_access", "Mail.Send", "Mail.Read", "User.Read"];

function providerConfig() {
  return {
    google: {
      configured: !!(Deno.env.get("GOOGLE_CLIENT_ID") && Deno.env.get("GOOGLE_CLIENT_SECRET")),
      label: "Gmail / Google Workspace",
    },
    microsoft: {
      configured: !!(Deno.env.get("MICROSOFT_CLIENT_ID") && Deno.env.get("MICROSOFT_CLIENT_SECRET")),
      label: "Outlook / Microsoft 365",
    },
  };
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
  const providers = providerConfig();

  /* ------------------------------- Status ---------------------------------- */
  if (action === "status") {
    const { data: mailboxes } = await admin
      .from("prospecting_mailboxes")
      .select("id, provider, email, display_name, status, daily_limit, last_error, last_checked_at, connected_at, token_expires_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at");

    const { data: emailSettings } = await admin
      .from("email_settings").select("provider, from_email")
      .eq("workspace_id", workspaceId).maybeSingle();

    return cfJson({
      ok: true,
      providers,
      mailboxes: mailboxes ?? [],
      fallback_sender: emailSettings
        ? { configured: true, provider: emailSettings.provider, from_email: emailSettings.from_email }
        : { configured: false, provider: null, from_email: null },
    });
  }

  /* --------------------------- Start an OAuth flow -------------------------- */
  if (action === "start_oauth") {
    const provider = String(body.provider ?? "");
    if (provider !== "google" && provider !== "microsoft") {
      return cfJson({ error: "Choose Google or Microsoft." }, 400);
    }
    if (!providers[provider].configured) {
      return cfJson({
        error: `${providers[provider].label} is not configured on this platform yet. ` +
          `Emails will keep sending from your verified workspace sender until it is.`,
        not_configured: true,
      }, 409);
    }

    const redirectUri = String(body.redirect_uri ?? "");
    if (!redirectUri.startsWith("https://")) {
      return cfJson({ error: "A valid https redirect address is required." }, 400);
    }

    const state = crypto.randomUUID();
    await admin.from("oauth_connection_states").insert({
      workspace_id: workspaceId, user_id: userId, state,
      provider: `client_finder_${provider}`, redirect_uri: redirectUri,
    });

    const url = provider === "google"
      ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(Deno.env.get("GOOGLE_CLIENT_ID")!)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent` +
        `&scope=${encodeURIComponent(GOOGLE_SCOPES.join(" "))}&state=${state}`
      : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(Deno.env.get("MICROSOFT_CLIENT_ID")!)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&response_mode=query` +
        `&scope=${encodeURIComponent(MS_SCOPES.join(" "))}&state=${state}`;

    return cfJson({ ok: true, authorize_url: url });
  }

  /* ------------------------------ OAuth callback ---------------------------- */
  if (action === "complete_oauth") {
    const provider = String(body.provider ?? "");
    const code = String(body.code ?? "");
    const state = String(body.state ?? "");
    if (!code || !state) return cfJson({ error: "The connection response was incomplete." }, 400);

    const { data: stateRow } = await admin
      .from("oauth_connection_states").select("*")
      .eq("state", state).eq("workspace_id", workspaceId).maybeSingle();
    if (!stateRow) return cfJson({ error: "This connection request has expired. Start again." }, 400);

    const isGoogle = provider === "google";
    const tokenUrl = isGoogle
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const clientId = Deno.env.get(isGoogle ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID");
    const clientSecret = Deno.env.get(isGoogle ? "GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_SECRET");
    if (!clientId || !clientSecret) return cfJson({ error: "This mailbox provider is not configured." }, 409);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: stateRow.redirect_uri, grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens.access_token) {
      return cfJson({ error: tokens.error_description || "The mailbox provider rejected the connection." }, 400);
    }

    // Resolve the mailbox address from the provider, never from client input.
    let email = "";
    let displayName: string | null = null;
    if (isGoogle) {
      const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).then((r) => r.json()).catch(() => ({}));
      email = String(me.email ?? "");
      displayName = me.name ?? null;
    } else {
      const me = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).then((r) => r.json()).catch(() => ({}));
      email = String(me.mail ?? me.userPrincipalName ?? "");
      displayName = me.displayName ?? null;
    }
    if (!isValidEmail(email)) return cfJson({ error: "The provider did not return a usable mailbox address." }, 400);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null;

    const { error } = await admin.from("prospecting_mailboxes").upsert({
      workspace_id: workspaceId, created_by: userId, provider, email: email.toLowerCase(),
      display_name: displayName, status: "connected", last_error: null,
      access_token: tokens.access_token, refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt, scopes: isGoogle ? GOOGLE_SCOPES : MS_SCOPES,
      connected_at: new Date().toISOString(), last_checked_at: new Date().toISOString(),
      archived_at: null,
    }, { onConflict: "workspace_id,provider,email" });
    if (error) return cfJson({ error: error.message }, 500);

    await admin.from("oauth_connection_states").delete().eq("state", state);
    await admin.from("prospecting_audit_events").insert({
      workspace_id: workspaceId, user_id: userId, action: "mailbox_connected",
      entity_type: "mailbox", detail: { provider, email },
    });
    return cfJson({ ok: true, email });
  }

  /* -------------------------------- Disconnect ------------------------------ */
  if (action === "disconnect") {
    const id = String(body.mailbox_id ?? "");
    const { data: mailbox } = await admin
      .from("prospecting_mailboxes").select("id, email, provider")
      .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (!mailbox) return cfJson({ error: "Mailbox not found." }, 404);

    await admin.from("prospecting_mailboxes").update({
      status: "disconnected", access_token: null, refresh_token: null,
      token_expires_at: null, archived_at: new Date().toISOString(),
    }).eq("id", id);

    // Campaigns must not keep sending from a mailbox that is gone.
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
});
