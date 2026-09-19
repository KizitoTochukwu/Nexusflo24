/**
 * Short-lived signed tokens for the NexusFlo Voice gateway.
 *
 * The gateway (Cloud Run) never holds database credentials. It receives one
 * token per call, carrying only what that call is allowed to do, and presents
 * it back to the platform. Tokens are HMAC-SHA256 signed with
 * VOICE_GATEWAY_SIGNING_KEY — the same value must be configured on the gateway.
 */

export interface VoiceGatewayClaims {
  call_session_id: string;
  workspace_id: string;
  assistant_id: string | null;
  config_version: number | null;
  tools: string[];
  exp: number; // unix seconds
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function gatewaySigningKey(): string | null {
  const key = Deno.env.get("VOICE_GATEWAY_SIGNING_KEY");
  return key && key.trim().length >= 16 ? key.trim() : null;
}

export async function signGatewayToken(claims: VoiceGatewayClaims): Promise<string | null> {
  const secret = gatewaySigningKey();
  if (!secret) return null;
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  const signature = b64url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

export async function verifyGatewayToken(token: string): Promise<VoiceGatewayClaims | null> {
  const secret = gatewaySigningKey();
  if (!secret || !token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".", 2);
  const expected = b64url(await hmac(secret, payload));
  if (!timingSafeEqual(expected, signature)) return null;
  let claims: VoiceGatewayClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  } catch {
    return null;
  }
  if (!claims?.call_session_id || !claims?.workspace_id) return null;
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  return claims;
}

/** Reads the bearer token from a gateway request and verifies it. */
export async function requireGatewayToken(req: Request): Promise<VoiceGatewayClaims | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return await verifyGatewayToken(token);
}

/**
 * Twilio request validation:
 * signature = base64( HMAC-SHA1( url + sorted_params_concat, authToken ) )
 */
export async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  headerSignature: string | null,
): Promise<boolean> {
  if (!headerSignature || !authToken) return false;
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const key = await crypto.subtle.importKey("raw", enc.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let binary = "";
  for (const b of sig) binary += String.fromCharCode(b);
  return timingSafeEqual(btoa(binary), headerSignature);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
