import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, startOfDay, format } from "date-fns";

export function useDashboardMetrics(workspaceId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-metrics", workspaceId],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();

      // Leads
      const { data: leads } = await supabase
        .from("leads")
        .select("id, status, created_at, score, full_name, email, source")
        .eq("workspace_id", workspaceId);
      const allLeads = leads ?? [];
      const totalLeads = allLeads.length;
      const newLeadsToday = allLeads.filter(l => l.created_at >= todayStart).length;

      // Leads over last 7 days for chart
      const leadsChartData: { day: string; leads: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(now, i));
        const dayEnd = startOfDay(subDays(now, i - 1));
        const count = allLeads.filter(l => {
          const d = new Date(l.created_at);
          return d >= dayStart && d < dayEnd;
        }).length;
        leadsChartData.push({ day: format(dayStart, "EEE"), leads: count });
      }

      // Recent leads (top 5)
      const recentLeads = [...allLeads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Campaign messages (for open/click rate)
      const { data: messages } = await supabase
        .from("campaign_messages")
        .select("id, opened, clicked, delivery_status, channel")
        .eq("workspace_id", workspaceId);
      const allMessages = messages ?? [];
      const delivered = allMessages.filter(m => m.delivery_status === "delivered" || m.delivery_status === "sent");
      const hasEmailData = delivered.length > 0;
      const openRate = hasEmailData
        ? ((delivered.filter(m => m.opened).length / delivered.length) * 100).toFixed(1)
        : null;
      const clickRate = hasEmailData
        ? ((delivered.filter(m => m.clicked).length / delivered.length) * 100).toFixed(1)
        : null;

      // Campaigns for chart
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name, sent_count, open_rate, click_rate, status")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(6);
      const campaignChartData = (campaigns ?? [])
        .filter(c => c.sent_count > 0)
        .map(c => ({
          name: c.name.length > 15 ? c.name.substring(0, 15) + "…" : c.name,
          sent: c.sent_count,
          opened: Math.round(c.sent_count * (c.open_rate / 100)),
          clicked: Math.round(c.sent_count * (c.click_rate / 100)),
        }));

      return {
        totalLeads,
        newLeadsToday,
        openRate,
        clickRate,
        hasEmailData,
        leadsChartData,
        recentLeads,
        campaignChartData,
        hasCampaignData: campaignChartData.length > 0,
      };
    },
    enabled: !!user && !!workspaceId,
  });
}
