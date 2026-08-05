// Shared Nexus AI helpers: gateway call, context building, action parsing.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const NEXUS_MODEL = "openai/gpt-5.6-sol";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Action types Nexus AI is allowed to propose. Anything else is rejected. */
export const ALLOWED_ACTIONS = [
  "update_lead_status",
  "update_lead_stage",
  "add_lead_tag",
  "remove_lead_tag",
  "assign_lead_owner",
  "create_lead_task",
  "create_lead_note",
  "pause_automation",
  "activate_automation",
  "pause_campaign",
] as const;

export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

export interface ProposedAction {
  action_type: AllowedAction;
  title: string;
  summary?: string;
  target_table?: string;
  target_id?: string | null;
  changes?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Calls the Lovable AI Gateway Responses API.
 * Always streams on the wire (reasoning models can run for minutes) and
 * accumulates the deltas server-side so callers get a single final string.
 */
export async function callNexusModel(opts: {
  apiKey: string;
  system: string;
  messages: Array<{ role: string; content: string }>;
  reasoning?: "low" | "medium" | "high" | false;
}): Promise<{ text: string; error?: { status: number; message: string } }> {
  const input = [
    { role: "developer", content: [{ type: "input_text", text: opts.system }] },
    ...opts.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [
        m.role === "assistant"
          ? { type: "output_text", text: m.content }
          : { type: "input_text", text: m.content },
      ],
    })),
  ];

  const body: Record<string, unknown> = {
    model: NEXUS_MODEL,
    input,
    stream: true,
    store: false,
  };
  if (opts.reasoning !== false) {
    body.reasoning = { effort: opts.reasoning || "low", summary: "auto" };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": opts.apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("nexus-ai gateway error", res.status, detail.slice(0, 800));
    let message = "Nexus AI is unavailable right now. Please try again.";
    if (res.status === 429) message = "Nexus AI is busy (rate limited). Try again in a moment.";
    if (res.status === 402) message = "AI credits are exhausted for this workspace.";
    return { text: "", error: { status: res.status, message } };
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
        } else if (evt.type === "response.completed" && !out) {
          out = evt.response?.output_text ?? "";
        }
      } catch {
        // ignore partial frames
      }
    }
  }

  return { text: out.trim() };
}

/**
 * Extracts a fenced ```nexus-actions JSON block from model output.
 * Returns the cleaned display text plus validated proposals.
 */
export function extractActions(text: string): { display: string; actions: ProposedAction[] } {
  const fence = /```nexus-actions\s*([\s\S]*?)```/i;
  const match = text.match(fence);
  if (!match) return { display: text.trim(), actions: [] };

  let actions: ProposedAction[] = [];
  try {
    const parsed = JSON.parse(match[1].trim());
    const list = Array.isArray(parsed) ? parsed : parsed?.actions;
    if (Array.isArray(list)) {
      actions = list
        .filter((a) => a && ALLOWED_ACTIONS.includes(a.action_type))
        .slice(0, 8)
        .map((a) => ({
          action_type: a.action_type,
          title: String(a.title || a.action_type).slice(0, 200),
          summary: a.summary ? String(a.summary).slice(0, 600) : undefined,
          target_table: a.target_table ? String(a.target_table) : undefined,
          target_id: a.target_id || null,
          changes: typeof a.changes === "object" && a.changes ? a.changes : {},
          payload: typeof a.payload === "object" && a.payload ? a.payload : {},
        }));
    }
  } catch (e) {
    console.warn("Failed to parse nexus-actions block", e);
  }

  return { display: text.replace(fence, "").trim(), actions };
}

/** Builds a compact, factual snapshot of the workspace for grounding. */
export async function buildWorkspaceContext(
  admin: any,
  workspaceId: string,
): Promise<string> {
  const safeCount = async (table: string, extra?: (q: any) => any) => {
    try {
      let q = admin.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
      if (extra) q = extra(q);
      const { count } = await q;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [leads, hot, newLeads30, campaigns, activeAutomations, bookings30, forms] = await Promise.all([
    safeCount("leads"),
    safeCount("leads", (q: any) => q.eq("status", "Hot")),
    safeCount("leads", (q: any) => q.gte("created_at", since)),
    safeCount("campaigns"),
    safeCount("automations", (q: any) => q.eq("status", "active")),
    safeCount("bookings", (q: any) => q.gte("created_at", since)),
    safeCount("forms"),
  ]);

  let topSources = "";
  try {
    const { data } = await admin
      .from("leads")
      .select("source")
      .eq("workspace_id", workspaceId)
      .limit(500);
    const tally: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      const s = r.source || "Unknown";
      tally[s] = (tally[s] || 0) + 1;
    });
    topSources = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s, n]) => `${s} (${n})`)
      .join(", ");
  } catch {
    topSources = "unavailable";
  }

  return [
    "CONFIRMED PLATFORM DATA (from the workspace database):",
    `- Total contacts: ${leads}`,
    `- Hot leads: ${hot}`,
    `- New contacts in last 30 days: ${newLeads30}`,
    `- Campaigns: ${campaigns}`,
    `- Active automations: ${activeAutomations}`,
    `- Bookings in last 30 days: ${bookings30}`,
    `- Forms: ${forms}`,
    `- Top lead sources: ${topSources || "none yet"}`,
  ].join("\n");
}

/** Authenticates the caller and verifies workspace membership. */
export async function authorize(
  req: Request,
  admin: any,
  workspaceId: string,
): Promise<{ userId: string } | Response> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  let userId: string | null = null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error) throw error;
    userId = data?.user?.id ?? null;
  } catch {
    return json({ error: "Invalid session. Please sign in again." }, 401);
  }
  if (!userId) return json({ error: "Invalid session. Please sign in again." }, 401);
  if (!workspaceId) return json({ error: "workspaceId is required" }, 400);

  const { data: isMember } = await admin.rpc("is_workspace_member", {
    _user_id: userId,
    _workspace_id: workspaceId,
  });
  if (isMember !== true) return json({ error: "You do not have access to this workspace." }, 403);

  return { userId };
}
