import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok } from "../guard";

/**
 * Write tool. Guarded: disabled unless the workspace raises CRM access above
 * view-only AND turns off "require approval" for CRM in AI Agent Connections.
 */
export default defineTool({
  name: "create_lead",
  title: "Create lead",
  description:
    "Create a new CRM lead in NexusFlo24. Requires the workspace to have granted write access to AI assistants for CRM and Leads. Requires at least full_name or email.",
  inputSchema: {
    workspace_id: z.string().uuid().optional().describe("Workspace to add the lead to."),
    full_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    source: z.string().optional().describe("Where the lead came from (e.g. 'ChatGPT')."),
    status: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) =>
    withGuard(
      ctx,
      { tool: "create_lead", group: "crm", write: true, risk: "medium", workspaceId: input.workspace_id },
      async ({ supabase, workspaceId, userId }) => {
        if (!input.full_name && !input.email)
          return { content: [{ type: "text" as const, text: "Provide at least full_name or email." }], isError: true };

        const { data, error } = await supabase
          .from("leads")
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            full_name: input.full_name ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            source: input.source ?? "AI Assistant",
            status: input.status ?? "New",
            notes: input.notes ?? null,
            tags: input.tags ?? null,
          })
          .select("id, full_name, email, status")
          .single();

        if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
        return ok(`Lead created: ${data.id}`, { lead: data });
      },
    ),
});
