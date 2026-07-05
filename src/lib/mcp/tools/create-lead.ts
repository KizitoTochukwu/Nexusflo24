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
  name: "create_lead",
  title: "Create lead",
  description:
    "Create a new CRM lead in NexusFlo24 for the signed-in user's workspace. Requires at least full_name or email. Optional notes, source, tags, status.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace to add the lead to."),
    full_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    source: z.string().optional().describe("Where the lead came from (e.g. 'ChatGPT MCP')."),
    status: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (!input.full_name && !input.email)
      return {
        content: [{ type: "text", text: "Provide at least full_name or email." }],
        isError: true,
      };

    const { data, error } = await client(ctx)
      .from("leads")
      .insert({
        user_id: ctx.getUserId(),
        workspace_id: input.workspace_id,
        full_name: input.full_name ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        source: input.source ?? "MCP",
        status: input.status ?? "New",
        notes: input.notes ?? null,
        tags: input.tags ?? null,
      })
      .select()
      .single();

    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Lead created: ${data.id}` }],
      structuredContent: { lead: data },
    };
  },
});
