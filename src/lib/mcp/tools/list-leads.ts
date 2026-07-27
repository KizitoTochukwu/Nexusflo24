import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description:
    "List the most recent NexusFlo24 leads for the signed-in user's workspace (name, email, phone, status, stage, score, source, tags, created_at). Optional workspace_id, status, and search filters. Max 50 rows.",
  inputSchema: {
    workspace_id: z.string().uuid().optional().describe("Optional workspace to scope leads to."),
    status: z.string().optional().describe("Optional status filter (e.g. New, Warm, Hot)."),
    search: z.string().optional().describe("Optional case-insensitive match on name or email."),
    limit: z.number().int().optional().describe("Max rows to return (default 25, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, status, search, limit }, ctx) =>
    withGuard(ctx, { tool: "list_leads", group: "crm", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      let q = supabase
        .from("leads")
        .select("id, full_name, email, phone, status, pipeline_stage, score, source, tags, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(clampLimit(limit));
      if (status) q = q.eq("status", status);
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { leads: data ?? [] });
    }),
});
