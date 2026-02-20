import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DateRange = { from: string; to: string };

export function useLeadAnalytics(workspaceId: string, range?: DateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-leads", workspaceId, range],
    queryFn: async () => {
      let q = supabase.from("leads").select("id, source, score, status, created_at").eq("workspace_id", workspaceId);
      if (range?.from) q = q.gte("created_at", range.from);
      if (range?.to) q = q.lte("created_at", range.to);
      const { data, error } = await q;
      if (error) throw error;
      const leads = data ?? [];
      const total = leads.length;

      // Source breakdown
      const sourceMap: Record<string, number> = {};
      leads.forEach((l: any) => { sourceMap[l.source || "Unknown"] = (sourceMap[l.source || "Unknown"] || 0) + 1; });
      const sources = Object.entries(sourceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

      // Score distribution
      const scoreBuckets = [
        { label: "0–20", min: 0, max: 20, count: 0 },
        { label: "21–40", min: 21, max: 40, count: 0 },
        { label: "41–60", min: 41, max: 60, count: 0 },
        { label: "61–80", min: 61, max: 80, count: 0 },
        { label: "81–100", min: 81, max: 100, count: 0 },
      ];
      leads.forEach((l: any) => {
        const s = l.score ?? 0;
        const bucket = scoreBuckets.find((b) => s >= b.min && s <= b.max);
        if (bucket) bucket.count++;
      });

      // Status breakdown
      const statusMap: Record<string, number> = {};
      leads.forEach((l: any) => { statusMap[l.status || "New"] = (statusMap[l.status || "New"] || 0) + 1; });
      const statuses = Object.entries(statusMap).map(([name, count]) => ({ name, count }));

      const wonCount = leads.filter((l: any) => l.status === "Won").length;
      const conversionRate = total > 0 ? ((wonCount / total) * 100).toFixed(1) : "0";

      return { total, sources, scoreBuckets, statuses, conversionRate, leads };
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCampaignAnalytics(workspaceId: string, range?: DateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-campaigns", workspaceId, range],
    queryFn: async () => {
      let cq = supabase.from("campaigns").select("id, name, type, sent_count, open_rate, click_rate, conversion_rate, status, created_at").eq("workspace_id", workspaceId);
      if (range?.from) cq = cq.gte("created_at", range.from);
      if (range?.to) cq = cq.lte("created_at", range.to);
      const { data: campaigns, error } = await cq;
      if (error) throw error;

      let mq = supabase.from("campaign_messages").select("id, campaign_id, channel, delivery_status, opened, clicked, replied, created_at").eq("workspace_id", workspaceId);
      if (range?.from) mq = mq.gte("created_at", range.from);
      if (range?.to) mq = mq.lte("created_at", range.to);
      const { data: messages } = await mq;

      const msgs = messages ?? [];
      const totalSent = msgs.length;
      const emailMsgs = msgs.filter((m: any) => m.channel === "email");
      const whatsappMsgs = msgs.filter((m: any) => m.channel === "whatsapp");
      const smsMsgs = msgs.filter((m: any) => m.channel === "sms");

      const emailOpenRate = emailMsgs.length > 0 ? ((emailMsgs.filter((m: any) => m.opened).length / emailMsgs.length) * 100).toFixed(1) : "0";
      const emailClickRate = emailMsgs.length > 0 ? ((emailMsgs.filter((m: any) => m.clicked).length / emailMsgs.length) * 100).toFixed(1) : "0";
      const whatsappReplyRate = whatsappMsgs.length > 0 ? ((whatsappMsgs.filter((m: any) => m.replied).length / whatsappMsgs.length) * 100).toFixed(1) : "0";
      const smsDeliveryRate = smsMsgs.length > 0 ? ((smsMsgs.filter((m: any) => m.delivery_status === "delivered").length / smsMsgs.length) * 100).toFixed(1) : "0";

      return {
        campaigns: campaigns ?? [],
        totalSent,
        emailOpenRate,
        emailClickRate,
        whatsappReplyRate,
        smsDeliveryRate,
        emailCount: emailMsgs.length,
        whatsappCount: whatsappMsgs.length,
        smsCount: smsMsgs.length,
      };
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useFunnelAnalytics(workspaceId: string, range?: DateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-funnels", workspaceId, range],
    queryFn: async () => {
      const { data: funnels } = await supabase.from("funnels").select("id, name, status, objective").eq("workspace_id", workspaceId);
      const { data: steps } = await supabase.from("funnel_steps").select("id, funnel_id, step_type, step_order, conversion_rate").eq("workspace_id", workspaceId).order("step_order");

      let vq = supabase.from("funnel_visits").select("id, funnel_id, step_id, converted, device_type, utm_source, utm_medium, created_at").eq("workspace_id", workspaceId);
      if (range?.from) vq = vq.gte("created_at", range.from);
      if (range?.to) vq = vq.lte("created_at", range.to);
      const { data: visits } = await vq;

      const funnelList = (funnels ?? []).map((f: any) => {
        const fSteps = (steps ?? []).filter((s: any) => s.funnel_id === f.id).sort((a: any, b: any) => a.step_order - b.step_order);
        const fVisits = (visits ?? []).filter((v: any) => v.funnel_id === f.id);
        const totalVisitors = fVisits.length;
        const converted = fVisits.filter((v: any) => v.converted).length;
        const conversionRate = totalVisitors > 0 ? ((converted / totalVisitors) * 100).toFixed(1) : "0";

        const stepBreakdown = fSteps.map((s: any) => {
          const stepVisits = fVisits.filter((v: any) => v.step_id === s.id);
          return { ...s, visitors: stepVisits.length, conversions: stepVisits.filter((v: any) => v.converted).length };
        });

        // Device breakdown
        const deviceMap: Record<string, number> = {};
        fVisits.forEach((v: any) => { deviceMap[v.device_type || "desktop"] = (deviceMap[v.device_type || "desktop"] || 0) + 1; });

        // UTM sources
        const utmMap: Record<string, number> = {};
        fVisits.forEach((v: any) => { if (v.utm_source) utmMap[v.utm_source] = (utmMap[v.utm_source] || 0) + 1; });

        return {
          ...f,
          totalVisitors,
          converted,
          conversionRate,
          stepBreakdown,
          devices: Object.entries(deviceMap).map(([name, count]) => ({ name, count })),
          utmSources: Object.entries(utmMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        };
      });

      return { funnels: funnelList, totalVisits: (visits ?? []).length };
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAutomationAnalytics(workspaceId: string, range?: DateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-automations", workspaceId, range],
    queryFn: async () => {
      const { data: automations } = await supabase.from("automations").select("id, name, trigger_type, status, run_count, last_run_at").eq("workspace_id", workspaceId);

      let lq = supabase.from("automation_logs").select("id, automation_id, event_type, status, created_at").eq("workspace_id", workspaceId);
      if (range?.from) lq = lq.gte("created_at", range.from);
      if (range?.to) lq = lq.lte("created_at", range.to);
      const { data: logs } = await lq;

      const allLogs = logs ?? [];
      const totalTriggers = allLogs.length;
      const successLogs = allLogs.filter((l: any) => l.status === "success").length;
      const failedLogs = allLogs.filter((l: any) => l.status === "failed").length;
      const messageSent = allLogs.filter((l: any) =>
        l.event_type?.includes("send_email") || l.event_type?.includes("send_whatsapp") || l.event_type?.includes("send_sms")
      ).length;

      const automationList = (automations ?? []).map((a: any) => {
        const aLogs = allLogs.filter((l: any) => l.automation_id === a.id);
        return { ...a, logCount: aLogs.length, successCount: aLogs.filter((l: any) => l.status === "success").length };
      });

      return { automations: automationList, totalTriggers, successLogs, failedLogs, messageSent };
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useRevenueAnalytics(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-revenue", workspaceId],
    queryFn: async () => {
      const { data: sub } = await supabase.from("subscriptions").select("plan, status, current_period_end, billing_cycle, created_at").eq("user_id", user!.id).maybeSingle();

      const { data: events } = await supabase.from("payment_events").select("type, payload, created_at").order("created_at", { ascending: false }).limit(50);

      const paymentSucceeded = (events ?? []).filter((e: any) => e.type === "invoice.payment_succeeded");
      const totalRevenue = paymentSucceeded.reduce((sum: number, e: any) => {
        const amount = (e.payload as any)?.amount_paid || (e.payload as any)?.total || 0;
        return sum + amount / 100;
      }, 0);

      return {
        subscription: sub,
        totalRevenue,
        mrr: sub?.plan === "pro" ? 49 : sub?.plan === "agency" ? 149 : 0,
        paymentEvents: paymentSucceeded.length,
        ltv: totalRevenue > 0 ? totalRevenue : sub?.plan === "pro" ? 49 * 12 : sub?.plan === "agency" ? 149 * 12 : 0,
      };
    },
    enabled: !!user && !!workspaceId,
  });
}
