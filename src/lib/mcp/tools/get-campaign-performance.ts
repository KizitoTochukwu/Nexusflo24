import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "get_campaign_performance",
  title: "Get campaign performance",
  description:
    "Get NexusFlo24 campaign performance — sent count, open rate, click rate and conversion rate — for one campaign or the workspace's most recent campaigns.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    campaign_id: z.string().uuid().optional().describe("Optional single campaign to report on."),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, campaign_id, limit }, ctx) =>
    withGuard(ctx, { tool: "get_campaign_performance", group: "campaigns", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      let q = supabase
        .from("campaigns")
        .select("id, name, type, status, sent_count, open_rate, click_rate, conversion_rate, scheduled_at, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(clampLimit(limit));
      if (campaign_id) q = q.eq("id", campaign_id);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { campaign_performance: data ?? [] });
    }),
});
