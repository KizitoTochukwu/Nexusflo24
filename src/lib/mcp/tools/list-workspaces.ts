import { defineTool } from "@lovable.dev/mcp-js";
import { withGuard, ok, userClient } from "../guard";

export default defineTool({
  name: "list_workspaces",
  title: "List workspaces",
  description:
    "List the signed-in user's NexusFlo24 workspaces. Use the returned workspace_id when calling other tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) =>
    withGuard(
      ctx,
      { tool: "list_workspaces", group: "settings", requireWorkspace: false },
      async () => {
        const supabase = userClient(ctx);
        const { data, error } = await supabase
          .from("workspace_members")
          .select("workspace_id, role, workspaces(id, name)")
          .eq("user_id", ctx.getUserId())
          .limit(50);
        if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
        return ok(JSON.stringify(data ?? []), { workspaces: data ?? [] });
      },
    ),
});
