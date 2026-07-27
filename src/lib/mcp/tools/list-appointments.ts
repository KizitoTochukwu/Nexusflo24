import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok, clampLimit } from "../guard";

export default defineTool({
  name: "list_appointments",
  title: "List appointments",
  description:
    "List NexusFlo24 appointments (bookings) for the workspace, optionally within a date range or by status. Returns guest name, time, status and location. Max 50 rows.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    from: z.string().optional().describe("ISO start of range (default now)."),
    to: z.string().optional().describe("ISO end of range."),
    status: z.string().optional().describe("Optional status filter (confirmed, cancelled, completed)."),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, from, to, status, limit }, ctx) =>
    withGuard(ctx, { tool: "list_appointments", group: "bookings", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      let q = supabase
        .from("bookings")
        .select("id, guest_name, guest_email, start_time, end_time, status, meeting_location, lead_id, created_at")
        .eq("workspace_id", workspaceId)
        .order("start_time", { ascending: true })
        .limit(clampLimit(limit));
      q = q.gte("start_time", from ?? new Date().toISOString());
      if (to) q = q.lte("start_time", to);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
      return ok(JSON.stringify(data ?? []), { appointments: data ?? [] });
    }),
});
