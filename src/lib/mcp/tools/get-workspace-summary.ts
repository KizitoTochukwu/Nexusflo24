import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok } from "../guard";

export default defineTool({
  name: "get_workspace_summary",
  title: "Get workspace summary",
  description:
    "Get a high-level NexusFlo24 workspace snapshot: workspace name plus total leads, hot leads, upcoming appointments, active campaigns and active automations.",
  inputSchema: { workspace_id: z.string().uuid().optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id }, ctx) =>
    withGuard(ctx, { tool: "get_workspace_summary", group: "analytics", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      const count = async (
        table: string,
        build?: (q: ReturnType<ReturnType<typeof supabase.from>["select"]>) => unknown,
      ) => {
        let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
        if (build) q = build(q) as typeof q;
        const { count: c } = await q;
        return c ?? 0;
      };

      const nowIso = new Date().toISOString();
      const [workspaceRes, leads, hotLeads, upcoming, campaigns, automations] = await Promise.all([
        supabase.from("workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
        count("leads"),
        count("leads", (q) => (q as any).gte("score", 81)),
        count("bookings", (q) => (q as any).gte("start_time", nowIso).neq("status", "cancelled")),
        count("campaigns", (q) => (q as any).eq("status", "active")),
        count("automations", (q) => (q as any).eq("status", "active")),
      ]);

      const summary = {
        workspace_id: workspaceId,
        workspace_name: workspaceRes.data?.name ?? null,
        total_leads: leads,
        hot_leads: hotLeads,
        upcoming_appointments: upcoming,
        active_campaigns: campaigns,
        active_automations: automations,
      };
      return ok(JSON.stringify(summary), { summary });
    }),
});
