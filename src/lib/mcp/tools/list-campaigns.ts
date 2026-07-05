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
  name: "list_campaigns",
  title: "List campaigns",
  description:
    "List the signed-in user's marketing campaigns (Email / WhatsApp / SMS) in NexusFlo24 with status and channel.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let q = client(ctx)
      .from("campaigns")
      .select("id, name, channel, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (workspace_id) q = q.eq("workspace_id", workspace_id);

    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { campaigns: data ?? [] },
    };
  },
});
