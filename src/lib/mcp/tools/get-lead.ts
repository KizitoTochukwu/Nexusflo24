import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok } from "../guard";

export default defineTool({
  name: "get_lead",
  title: "Get lead",
  description: "Get a single NexusFlo24 lead by id, including status, stage, score, source, tags and notes.",
  inputSchema: {
    lead_id: z.string().uuid().describe("The lead to fetch."),
    workspace_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lead_id, workspace_id }, ctx) =>
    withGuard(ctx, { tool: "get_lead", group: "crm", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email, phone, status, pipeline_stage, score, source, tags, notes, last_activity_at, created_at")
        .eq("workspace_id", workspaceId)
        .eq("id", lead_id)
        .maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      if (!data) return { content: [{ type: "text" as const, text: "Lead not found in this workspace." }], isError: true };
      return ok(JSON.stringify(data), { lead: data });
    }),
});
