import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description:
    "List the signed-in user's most recent leads in NexusFlo24 (name, email, phone, status, stage, score, source, tags, created_at). Optional workspace_id, status, and search filters.",
  inputSchema: {
    workspace_id: z.string().uuid().optional().describe("Optional workspace to scope leads to."),
    status: z.string().optional().describe("Optional status filter (e.g. New, Contacted, Qualified)."),
    search: z.string().optional().describe("Optional case-insensitive match on name or email."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let q = client(ctx)
      .from("leads")
      .select("id, full_name, email, phone, status, pipeline_stage, score, source, tags, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);

    if (workspace_id) q = q.eq("workspace_id", workspace_id);
    if (status) q = q.eq("status", status);
    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
