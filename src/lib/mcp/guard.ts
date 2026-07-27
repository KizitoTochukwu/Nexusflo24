import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Hard cap on any list response returned to an AI assistant. */
export const MAX_ROWS = 50;

/** Requests allowed per user per rolling 60s window. */
const RATE_LIMIT_PER_MINUTE = 60;

export type PermissionGroup =
  | "crm"
  | "messages"
  | "bookings"
  | "campaigns"
  | "automations"
  | "funnels"
  | "analytics"
  | "settings";

export type AccessLevel = "none" | "view" | "write" | "full";

const DEFAULT_ACCESS: AccessLevel = "view";

/** Supabase client bound to the caller's OAuth access token — RLS applies as that user. */
export function userClient(ctx: ToolContext): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Server-only client used for audit + rate-limit bookkeeping. Never exposed to tools. */
function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function fail(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function ok(text: string, structured?: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], structuredContent: structured };
}

export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return 25;
  return Math.min(Math.floor(limit), MAX_ROWS);
}

async function audit(params: {
  workspaceId: string | null;
  userId: string | null;
  clientId: string | null;
  tool: string;
  summary: string;
  risk: string;
  execution: "success" | "rejected" | "failed";
  errorCode?: string;
  durationMs?: number;
}) {
  const admin = adminClient();
  if (!admin) return;
  try {
    await admin.from("mcp_tool_activity").insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      oauth_client_id: params.clientId,
      tool_name: params.tool,
      summary: params.summary.slice(0, 500),
      risk_level: params.risk,
      approval_status: "not_required",
      execution_status: params.execution,
      error_code: params.errorCode ?? null,
      duration_ms: params.durationMs ?? null,
    });
  } catch {
    /* auditing must never break a tool call */
  }
}

async function withinRateLimit(userId: string, workspaceId: string | null): Promise<boolean> {
  const admin = adminClient();
  if (!admin) return true;
  const window = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  try {
    const { data } = await admin
      .from("mcp_rate_limits")
      .select("id, request_count")
      .eq("user_id", userId)
      .eq("window_start", window)
      .limit(1)
      .maybeSingle();


    if (!data) {
      await admin
        .from("mcp_rate_limits")
        .insert({ user_id: userId, workspace_id: workspaceId, window_start: window, request_count: 1 });
      return true;
    }
    if (data.request_count >= RATE_LIMIT_PER_MINUTE) return false;
    await admin
      .from("mcp_rate_limits")
      .update({ request_count: data.request_count + 1 })
      .eq("id", data.id);
    return true;
  } catch {
    return true;
  }
}

/** Touch/record the connected client so the app can show real connection state. */
async function touchConnection(workspaceId: string, clientId: string | null, userId: string) {
  const admin = adminClient();
  if (!admin || !clientId) return;
  try {
    const { data } = await admin
      .from("mcp_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("oauth_client_id", clientId)
      .maybeSingle();
    if (data) {
      await admin.from("mcp_connections").update({ last_seen_at: new Date().toISOString(), status: "active" }).eq("id", data.id);
    } else {
      await admin.from("mcp_connections").insert({
        workspace_id: workspaceId,
        client_key: "custom",
        oauth_client_id: clientId,
        status: "active",
        last_seen_at: new Date().toISOString(),
        created_by: userId,
      });
    }
  } catch {
    /* non-fatal */
  }
}

export type GuardScope = {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
};

/**
 * Wraps every MCP tool: authenticates, resolves + validates workspace membership
 * server-side (never trusting the client-supplied workspace_id as proof of access),
 * enforces workspace tool permissions, rate limits, and audits the outcome.
 */
export async function withGuard(
  ctx: ToolContext,
  opts: {
    tool: string;
    group: PermissionGroup;
    write?: boolean;
    risk?: "low" | "medium" | "high";
    workspaceId?: string;
    requireWorkspace?: boolean;
  },
  run: (scope: GuardScope) => Promise<ToolResult>,
): Promise<ToolResult> {
  const started = Date.now();
  const risk = opts.risk ?? (opts.write ? "high" : "low");
  const clientId = (() => {
    try {
      return ctx.getClientId?.() ?? null;
    } catch {
      return null;
    }
  })();

  if (!ctx.isAuthenticated()) {
    return fail("Not authenticated. Reconnect your AI assistant to NexusFlo24.");
  }
  const userId = ctx.getUserId();
  const supabase = userClient(ctx);

  // Resolve workspace strictly from the caller's own memberships.
  const { data: memberships, error: memErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (memErr) {
    await audit({ workspaceId: null, userId, clientId, tool: opts.tool, summary: "membership lookup failed", risk, execution: "failed", errorCode: memErr.code });
    return fail("Could not verify your workspace access.");
  }

  const allowed = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id);
  let workspaceId = opts.workspaceId ?? allowed[0];

  if (opts.requireWorkspace !== false) {
    if (!workspaceId) {
      await audit({ workspaceId: null, userId, clientId, tool: opts.tool, summary: "no workspace", risk, execution: "rejected" });
      return fail("No NexusFlo24 workspace is available for your account.");
    }
    if (!allowed.includes(workspaceId)) {
      await audit({ workspaceId: null, userId, clientId, tool: opts.tool, summary: "workspace access denied", risk, execution: "rejected", errorCode: "workspace_forbidden" });
      return fail("You do not have access to that workspace.");
    }
  }
  workspaceId = workspaceId ?? "";

  if (!(await withinRateLimit(userId, workspaceId || null))) {
    await audit({ workspaceId: workspaceId || null, userId, clientId, tool: opts.tool, summary: "rate limited", risk, execution: "rejected", errorCode: "rate_limited" });
    return fail("Rate limit reached. Please try again in a minute.");
  }

  // Permission check for this capability group.
  if (workspaceId) {
    const { data: perm } = await supabase
      .from("mcp_tool_permissions")
      .select("access_level, require_approval")
      .eq("workspace_id", workspaceId)
      .eq("permission_group", opts.group)
      .maybeSingle();

    const level = ((perm?.access_level as AccessLevel) ?? DEFAULT_ACCESS) as AccessLevel;
    if (level === "none") {
      await audit({ workspaceId, userId, clientId, tool: opts.tool, summary: "permission denied", risk, execution: "rejected", errorCode: "permission_denied" });
      return fail(`AI assistant access to ${opts.group} is turned off for this workspace.`);
    }
    if (opts.write && level === "view") {
      await audit({ workspaceId, userId, clientId, tool: opts.tool, summary: "write not permitted", risk, execution: "rejected", errorCode: "write_denied" });
      return fail(`Your workspace only allows read-only AI access to ${opts.group}.`);
    }
    if (opts.write && (perm?.require_approval ?? true)) {
      await audit({ workspaceId, userId, clientId, tool: opts.tool, summary: "approval required", risk, execution: "rejected", errorCode: "approval_required" });
      return fail("This action requires approval inside NexusFlo24 before an AI assistant can run it.");
    }
    await touchConnection(workspaceId, clientId, userId);
  }

  try {
    const result = await run({ supabase, workspaceId, userId });
    await audit({
      workspaceId: workspaceId || null,
      userId,
      clientId,
      tool: opts.tool,
      summary: result.isError ? "tool returned an error" : "completed",
      risk,
      execution: result.isError ? "failed" : "success",
      durationMs: Date.now() - started,
    });
    return result;
  } catch (e) {
    await audit({ workspaceId: workspaceId || null, userId, clientId, tool: opts.tool, summary: "unhandled error", risk, execution: "failed", durationMs: Date.now() - started });
    return fail("That request could not be completed.");
  }
}
