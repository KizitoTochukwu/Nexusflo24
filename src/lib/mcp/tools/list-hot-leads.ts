import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "list_hot_leads",
  title: "List hot leads",
  description:
    "List the workspace's hottest NexusFlo24 leads — highest lead score first, optionally only those above a minimum score. Max 50 rows.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    min_score: z.number().int().optional().describe("Minimum lead score (default 81 = Hot)."),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, min_score, limit }, ctx) =>
    withGuard(ctx, { tool: "list_hot_leads", group: "crm", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email, phone, status, pipeline_stage, score, source, last_activity_at, created_at")
        .eq("workspace_id", workspaceId)
        .gte("score", min_score ?? 81)
        .order("score", { ascending: false })
        .limit(clampLimit(limit));
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { hot_leads: data ?? [] });
    }),
});
