/**
 * Thin client for the NexusFlo24 platform.
 *
 * The gateway holds no database credentials — only the short-lived, per-call
 * token it received on the WebSocket URL. Every request carries that token.
 */

const PLATFORM_URL = (process.env.PLATFORM_FUNCTIONS_URL || "").replace(/\/+$/, "");

async function post(path: string, token: string, body: unknown): Promise<any> {
  const res = await fetch(`${PLATFORM_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    console.error(`[platform] ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Platform request failed (${res.status})`);
  }
  return data;
}

export const platform = {
  start: (token: string) => post("voice-gateway-session", token, { action: "start" }),
  knowledge: (token: string, query: string) => post("voice-gateway-session", token, { action: "knowledge", query }),
  transcript: (token: string, turns: unknown[]) => post("voice-gateway-session", token, { action: "transcript", turns }),
  event: (token: string, event_type: string, payload: unknown, external_event_id?: string) =>
    post("voice-gateway-session", token, { action: "event", event_type, payload, external_event_id }),
  end: (token: string, body: Record<string, unknown>) => post("voice-gateway-session", token, { action: "end", ...body }),
  tool: (token: string, callSessionId: string, tool: string, input: Record<string, unknown>, idempotencyKey?: string) =>
    post("voice-tools", token, { call_session_id: callSessionId, tool, input, idempotency_key: idempotencyKey }),
};
