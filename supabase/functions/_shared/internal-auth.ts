/**
 * Guard for internal-only edge functions that should only be invoked
 * server-to-server (by other edge functions using the service-role key).
 *
 * Accepts the request when either:
 *  - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>, OR
 *  - X-Internal-Secret matches INTERNAL_FUNCTION_SECRET (optional fallback)
 *
 * Returns a Response (403) when the caller is not authorized, or null when OK.
 */
export function requireInternalCaller(req: Request): Response | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (serviceRoleKey && bearer && bearer === serviceRoleKey) return null;

  const provided = req.headers.get("x-internal-secret") || "";
  if (internalSecret && provided && provided === internalSecret) return null;

  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
