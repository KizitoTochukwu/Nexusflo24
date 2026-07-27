import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "list_conversations",
  title: "List conversations",
  description:
    "List recent NexusFlo24 customer conversation messages across Email, SMS and WhatsApp, with channel, direction, intent and status. Max 50 rows.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional().describe("Optional lead to scope the conversation to."),
    channel: z.string().optional().describe("Optional channel filter (email, sms, whatsapp)."),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, lead_id, channel, limit }, ctx) =>
    withGuard(ctx, { tool: "list_conversations", group: "messages", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      let q = supabase
        .from("sales_conversations")
        .select("id, lead_id, channel, direction, message_body, intent, status, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(clampLimit(limit));
      if (lead_id) q = q.eq("lead_id", lead_id);
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { conversations: data ?? [] });
    }),
});
