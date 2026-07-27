import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withGuard, ok } from "../guard";

export default defineTool({
  name: "get_workspace_analytics",
  title: "Get workspace analytics",
  description:
    "Get NexusFlo24 business analytics for a period (default last 30 days): new leads, hot leads, bookings, campaigns sent and average open/click rates.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    days: z.number().int().optional().describe("Look-back window in days (default 30, max 365)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, days }, ctx) =>
    withGuard(ctx, { tool: "get_workspace_analytics", group: "analytics", workspaceId: workspace_id }, async ({ supabase, workspaceId }) => {
      const window = Math.min(Math.max(days ?? 30, 1), 365);
      const since = new Date(Date.now() - window * 86400000).toISOString();

      const [leadsRes, bookingsRes, campaignsRes] = await Promise.all([
        supabase.from("leads").select("score, created_at").eq("workspace_id", workspaceId).gte("created_at", since).limit(5000),
        supabase.from("bookings").select("id, status").eq("workspace_id", workspaceId).gte("created_at", since).limit(5000),
        supabase
          .from("campaigns")
          .select("sent_count, open_rate, click_rate, conversion_rate, created_at")
          .eq("workspace_id", workspaceId)
          .gte("created_at", since)
          .limit(500),
      ]);

      const leads = leadsRes.data ?? [];
      const campaigns = campaignsRes.data ?? [];
      const avg = (key: "open_rate" | "click_rate" | "conversion_rate") =>
        campaigns.length
          ? Math.round((campaigns.reduce((s, c) => s + Number(c[key] ?? 0), 0) / campaigns.length) * 100) / 100
          : 0;

      const analytics = {
        workspace_id: workspaceId,
        period_days: window,
        new_leads: leads.length,
        new_hot_leads: leads.filter((l) => (l.score ?? 0) >= 81).length,
        bookings: (bookingsRes.data ?? []).length,
        cancelled_bookings: (bookingsRes.data ?? []).filter((b) => b.status === "cancelled").length,
        campaigns_created: campaigns.length,
        messages_sent: campaigns.reduce((s, c) => s + Number(c.sent_count ?? 0), 0),
        avg_open_rate: avg("open_rate"),
        avg_click_rate: avg("click_rate"),
        avg_conversion_rate: avg("conversion_rate"),
      };
      return ok(JSON.stringify(analytics), { analytics });
    }),
});
