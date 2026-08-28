// Server-only. Sends an email through a workspace member's own Gmail account
// using the App User Connector gateway.
import { callAsAppUser } from "./appUserConnector.ts";
import { getConnectionKeyForUser } from "./appUserConnections.ts";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_mail";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export function buildRawEmail(
  { to, from, subject, html }: { to: string; from: string; subject: string; html: string },
): string {
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  return b64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface GmailSendResult {
  ok: boolean;
  providerMessageId: string | null;
  error: string | null;
}

/**
 * Sends as the person who connected the mailbox. Returns a structured result —
 * a 2xx here means Gmail accepted the message, never that it was delivered.
 */
export async function sendViaGmail(params: {
  ownerUserId: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}): Promise<GmailSendResult> {
  try {
    const connectionAPIKey = await getConnectionKeyForUser(params.ownerUserId, CONNECTOR_ID);
    if (!connectionAPIKey) {
      return { ok: false, providerMessageId: null, error: "The Gmail mailbox is no longer connected." };
    }
    const raw = buildRawEmail({
      to: params.to, from: params.fromEmail, subject: params.subject, html: params.html,
    });
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/gmail/v1/users/me/messages/send",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, providerMessageId: null, error: `Gmail rejected the send (${res.status}): ${text.slice(0, 300)}` };
    }
    let parsed: { id?: string } = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch { /* Gmail returned a non-JSON success body; the send still succeeded. */ }
    return { ok: true, providerMessageId: parsed.id ?? null, error: null };
  } catch (e) {
    return { ok: false, providerMessageId: null, error: (e as Error).message };
  }
}
