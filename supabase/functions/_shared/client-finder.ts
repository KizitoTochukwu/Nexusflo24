// Shared helpers for the AI Client Finder module.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cfCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const cfJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cfCors, "Content-Type": "application/json" },
  });

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verify the caller's JWT and workspace membership. Returns the user id. */
export async function requireMember(
  req: Request,
  admin: ReturnType<typeof adminClient>,
  workspaceId: string,
): Promise<{ userId: string } | Response> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return cfJson({ error: "Unauthorized" }, 401);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return cfJson({ error: "Invalid token" }, 401);
  const userId = data.user.id;

  if (!workspaceId) return cfJson({ error: "workspace_id is required" }, 400);
  const { data: isMember } = await admin.rpc("is_workspace_member", {
    _user_id: userId,
    _workspace_id: workspaceId,
  });
  if (isMember !== true) return cfJson({ error: "Forbidden" }, 403);
  return { userId };
}

const PRIVATE_HOST = /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|.*\.local|.*\.internal)$/i;

/** HTTPS-only, SSRF-guarded URL check. Throws on rejection. */
export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    throw new Error("That does not look like a valid website address.");
  }
  if (url.protocol !== "https:") throw new Error("Only https:// websites can be analysed.");
  const host = url.hostname;
  if (PRIVATE_HOST.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    throw new Error("That address is not a public website.");
  }
  return url;
}

/** Fetch a public page with redirect revalidation and a hard size/time budget. */
export async function fetchPublicPage(
  target: URL,
  timeoutMs = 10_000,
): Promise<{ url: string; status: number; text: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(target.toString(), {
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "User-Agent": "NexusFlo24-ClientFinder/1.0 (+https://nexusflo24.com)" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { url: target.toString(), status: res.status, text: "" };
      const next = assertPublicHttpsUrl(new URL(loc, target).toString());
      return await fetchPublicPage(next, timeoutMs);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      return { url: target.toString(), status: res.status, text: "" };
    }
    const raw = await res.text();
    return { url: target.toString(), status: res.status, text: raw.slice(0, 300_000) };
  } finally {
    clearTimeout(t);
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a fenced or bare JSON object out of a model reply. */
export function parseModelJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function logUsage(
  admin: ReturnType<typeof adminClient>,
  row: Record<string, unknown>,
) {
  try {
    await admin.from("prospecting_usage_events").insert(row);
  } catch (e) {
    console.error("usage log failed", (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Entitlements (server-enforced). Limits live in the database so platform staff
// can change them without a code change.
// ---------------------------------------------------------------------------

export type CfEntitlements = {
  plan: string;
  enabled: boolean;
  suspended: boolean;
  suspension_reason: string | null;
  limits: Record<string, number | boolean>;
  usage: Record<string, number>;
};

const LIMIT_FOR: Record<string, string> = {
  emails: "monthly_emails",
  ai_ops: "monthly_ai_ops",
  verifications: "monthly_verifications",
  discoveries: "monthly_discoveries",
  campaigns: "max_campaigns",
  mailboxes: "max_mailboxes",
};

export async function loadEntitlements(
  admin: ReturnType<typeof adminClient>,
  workspaceId: string,
): Promise<CfEntitlements | null> {
  const { data, error } = await admin.rpc("client_finder_entitlements", {
    _workspace_id: workspaceId,
  });
  if (error || !data) {
    console.error("entitlements lookup failed", error?.message);
    return null;
  }
  return data as CfEntitlements;
}

/**
 * Returns a Response when the workspace may not perform `usageKey` right now,
 * otherwise null. Fails closed only on explicit suspension; a lookup failure is
 * reported honestly rather than silently allowing unlimited use.
 */
export async function checkEntitlement(
  admin: ReturnType<typeof adminClient>,
  workspaceId: string,
  usageKey: keyof typeof LIMIT_FOR,
  needed = 1,
): Promise<Response | null> {
  const ent = await loadEntitlements(admin, workspaceId);
  if (!ent) return cfJson({ error: "Could not check your plan allowance. Please try again." }, 503);

  if (ent.suspended) {
    return cfJson({
      error: "AI Client Finder is suspended for this workspace.",
      reason: ent.suspension_reason ?? null,
      code: "suspended",
    }, 403);
  }
  if (ent.enabled === false) {
    return cfJson({ error: "AI Client Finder is not enabled for this workspace.", code: "disabled" }, 403);
  }

  const limitKey = LIMIT_FOR[usageKey];
  const limit = Number(ent.limits?.[limitKey] ?? 0);
  const used = Number(ent.usage?.[usageKey] ?? 0);
  if (used + needed > limit) {
    return cfJson({
      error: `Your ${ent.plan} plan allows ${limit} ${usageKey.replace("_", " ")} — you have used ${used}.`,
      code: "limit_reached",
      limit,
      used,
    }, 402);
  }
  return null;
}
