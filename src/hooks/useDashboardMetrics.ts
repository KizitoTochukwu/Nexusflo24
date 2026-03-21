import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, startOfDay, format } from "date-fns";
import { useDemoMode } from "@/hooks/useDemoMode";
import { generateDemoMetrics } from "@/lib/demo/demoData";

export function useDashboardMetrics(workspaceId: string) {
  const { user } = useAuth();
  const { data: demoSettings } = useDemoMode(workspaceId);
  const queryClient = useQueryClient();

  // Real-time subscription: auto-refresh metrics on campaign_messages or leads changes
  useEffect(() => {
    if (!workspaceId || demoSettings?.demo_mode_enabled) return;

    const channel = supabase
      .channel(`dashboard-rt-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_messages", filter: `workspace_id=eq.${workspaceId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", workspaceId] }); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads", filter: `workspace_id=eq.${workspaceId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", workspaceId] }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, demoSettings?.demo_mode_enabled, queryClient]);

  return useQuery({
    queryKey: ["dashboard-metrics", workspaceId, demoSettings?.demo_mode_enabled, demoSettings?.demo_seed_variant],
    queryFn: async () => {
      // If demo mode is on, return deterministic demo data
      if (demoSettings?.demo_mode_enabled) {
        return generateDemoMetrics(workspaceId, demoSettings.demo_seed_variant);
      }

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();

      // Leads
      const { data: leads } = await supabase
        .from("leads")
        .select("id, status, created_at, score, full_name, email, source, ai_qualification")
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

      // AI qualification distribution
      const aiQualified = allLeads.filter(l => (l as any).ai_qualification?.verdict);
      const aiDistribution = {
        hot: aiQualified.filter(l => (l as any).ai_qualification.verdict === "hot").length,
        warm: aiQualified.filter(l => (l as any).ai_qualification.verdict === "warm").length,
        cold: aiQualified.filter(l => (l as any).ai_qualification.verdict === "cold").length,
        not_qualified: aiQualified.filter(l => (l as any).ai_qualification.verdict === "not_qualified").length,
        total: aiQualified.length,
      };

      // Revenue from payment_events
      const { data: paymentEvents } = await supabase
        .from("payment_events")
        .select("type, payload, created_at")
        .eq("type", "invoice.payment_succeeded")
        .order("created_at", { ascending: false })
        .limit(100);

      const successfulPayments = paymentEvents ?? [];
      const totalRevenue = successfulPayments.reduce((sum, e) => {
        const p = e.payload as any;
        const amount = p?.amount_paid || p?.total || 0;
        return sum + amount / 100;
      }, 0);

      // MRR from current subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user!.id)
        .maybeSingle();

      const mrr = sub?.status === "active"
        ? (sub.plan === "pro" ? 49 : sub.plan === "agency" ? 149 : sub.plan === "starter" ? 19 : sub.plan === "plus" ? 39 : sub.plan === "enterprise" ? 249 : 0)
        : 0;

      const revenue = totalRevenue > 0 ? totalRevenue : mrr > 0 ? mrr : null;

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
        revenue,
        isDemo: false,
        aiDistribution,
      };
    },
    enabled: !!user && !!workspaceId && demoSettings !== undefined,
  });
}
