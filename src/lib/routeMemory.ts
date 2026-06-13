import { supabase } from "@/integrations/supabase/client";

export interface LastRoute {
  workspace_id: string;
  path: string; // includes search + hash
  scrollY?: number;
  saved_at: string;
}

const SKIP_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/",
  "/unsubscribe",
  "/f/",
  "/form/",
  "/book/",
  "/r/", // referral
];

const VOLATILE_PARAMS = ["session_id", "code", "state", "access_token", "refresh_token"];

export const lsKey = (userId: string, workspaceId: string) =>
  `nf24:lastRoute:${userId}:${workspaceId}`;

export const lsKeyAny = (userId: string) => `nf24:lastRouteAny:${userId}`;

export function isPersistablePath(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  if (path === "/" || path === "/dashboard") return false;
  return !SKIP_PREFIXES.some((p) => path.startsWith(p));
}

export function stripVolatile(path: string): string {
  try {
    const url = new URL(path, "http://x");
    let mutated = false;
    VOLATILE_PARAMS.forEach((k) => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        mutated = true;
      }
    });
    if (!mutated) return path;
    const qs = url.searchParams.toString();
    return url.pathname + (qs ? `?${qs}` : "") + url.hash;
  } catch {
    return path;
  }
}

export function extractWorkspaceId(path: string): string | null {
  const m = path.match(/^\/dashboard\/([^/]+)\//);
  return m?.[1] ?? null;
}

export function saveLastRoute(userId: string, route: LastRoute) {
  try {
    localStorage.setItem(lsKey(userId, route.workspace_id), JSON.stringify(route));
    localStorage.setItem(lsKeyAny(userId), JSON.stringify(route));
  } catch {}
}

export function readLastRouteLocal(userId: string, workspaceId?: string): LastRoute | null {
  try {
    const raw = workspaceId
      ? localStorage.getItem(lsKey(userId, workspaceId))
      : localStorage.getItem(lsKeyAny(userId));
    return raw ? (JSON.parse(raw) as LastRoute) : null;
  } catch {
    return null;
  }
}

export async function fetchLastRouteRemote(userId: string): Promise<LastRoute | null> {
  const { data } = await supabase
    .from("profiles")
    .select("last_route")
    .eq("id", userId)
    .maybeSingle();
  const v = (data as { last_route?: LastRoute | null } | null)?.last_route;
  return v && typeof v === "object" && v.path ? v : null;
}

export async function persistLastRouteRemote(userId: string, route: LastRoute) {
  await supabase.from("profiles").update({ last_route: route as unknown as object }).eq("id", userId);
}

export function clearLastRoute(userId: string) {
  try {
    localStorage.removeItem(lsKeyAny(userId));
    // Cannot enumerate all workspace keys cheaply; iterate
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`nf24:lastRoute:${userId}:`)) localStorage.removeItem(k);
    }
  } catch {}
}

export async function resolveRestoreTarget(
  userId: string,
  preferredWorkspaceId?: string,
): Promise<string | null> {
  const local =
    (preferredWorkspaceId && readLastRouteLocal(userId, preferredWorkspaceId)) ||
    readLastRouteLocal(userId);
  if (local?.path && isPersistablePath(local.path)) return local.path;

  const remote = await fetchLastRouteRemote(userId);
  if (remote?.path && isPersistablePath(remote.path)) return remote.path;
  return null;
}
