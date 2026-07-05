import { requireInternalCaller } from "./internal-auth.ts";

/**
 * Allow a request if either:
 *  - it satisfies requireInternalCaller (service-role / internal secret), OR
 *  - it carries a valid user JWT whose user is a member of `workspaceId`
 *    (or a platform admin).
 *
 * Returns null on success, or a 401/403 Response otherwise.
 */
export async function requireInternalOrWorkspaceMember(
  req: Request,
  adminClient: any,
  workspaceId: string,
): Promise<Response | null> {
  // 1. Internal path
  const internal = requireInternalCaller(req);
  if (internal === null) return null;

  // 2. User JWT path
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string | null = null;
  try {
    const { data, error } = await adminClient.auth.getUser(token);
    if (error) throw error;
    userId = data?.user?.id ?? null;
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Platform admin bypass
  try {
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (isAdmin === true) return null;
  } catch (_e) {
    // ignore, fall through to membership check
  }

  // Workspace membership
  try {
    const { data: isMember } = await adminClient.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (isMember === true) return null;
  } catch (_e) {
    // fall through
  }

  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
