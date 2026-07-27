import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "list_automations",
  title: "List automations",
  description:
    "List NexusFlo24 automations for the workspace with status, trigger summary, run count and last run time. Max 50 rows.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    status: z.string().optional().describe("Optional status filter (active, paused, draft)."),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, status, limit }, ctx) =>
    withGuard(ctx, { tool: "list_automations", group: "automations", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      let q = supabase
        .from("automations")
        .select("id, name, status, trigger_type, trigger_summary, run_count, last_run_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(clampLimit(limit));
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { automations: data ?? [] });
    }),
});
