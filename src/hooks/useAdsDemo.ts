import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DEMO_ACCOUNTS, DEMO_CAMPAIGNS, DEMO_AD_SETS, buildDemoMetrics, buildDemoLeads,
} from "@/lib/ads/demoData";

const db = supabase as any;

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  ["ad-connections", "ad-accounts", "ad-campaigns", "ad-metrics", "ad-attribution", "ad-sync-logs"]
    .forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
};

/** Populate the workspace with realistic sample advertising data. */
export function useSeedAdsDemo() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      // Clear any previous demo rows first so re-seeding stays idempotent.
      await clearDemo(workspaceId);

      const connections = DEMO_ACCOUNTS.map((a) => ({
        workspace_id: workspaceId,
        provider: a.provider,
        status: "connected",
        business_name: a.name,
        external_business_id: a.external,
        scopes: ["ads_read", "leads_retrieval"],
        last_sync_at: new Date().toISOString(),
        is_demo: true,
        created_by: user?.id ?? null,
      }));
      const { data: conRows, error: conErr } = await db
        .from("ad_connections").insert(connections).select("id, provider");
      if (conErr) throw conErr;

      const conByProvider = Object.fromEntries((conRows ?? []).map((r: any) => [r.provider, r.id]));

      const accounts = DEMO_ACCOUNTS.map((a) => ({
        workspace_id: workspaceId,
        connection_id: conByProvider[a.provider] ?? null,
        provider: a.provider,
        external_account_id: a.external,
        name: a.name,
        currency: a.currency,
        status: "active",
        is_enabled: true,
        is_demo: true,
        last_sync_at: new Date().toISOString(),
      }));
      const { data: accRows, error: accErr } = await db
        .from("ad_accounts").insert(accounts).select("id, provider");
      if (accErr) throw accErr;
      const accByProvider = Object.fromEntries((accRows ?? []).map((r: any) => [r.provider, r.id]));

      const campaigns = DEMO_CAMPAIGNS.map((c) => ({
        workspace_id: workspaceId,
        ad_account_id: accByProvider[c.provider] ?? null,
        provider: c.provider,
        external_campaign_id: `demo_${c.key}`,
        name: c.name,
        status: c.status,
        objective: c.objective,
        sub_channel: c.sub_channel,
        budget_amount: c.budget,
        budget_type: "daily",
        currency: "GBP",
        audience_summary: { summary: c.audience },
        is_demo: true,
        last_synced_at: new Date().toISOString(),
      }));
      const { data: campRows, error: campErr } = await db
        .from("ad_campaigns").insert(campaigns).select("id, external_campaign_id");
      if (campErr) throw campErr;
      const campByKey = Object.fromEntries(
        (campRows ?? []).map((r: any) => [String(r.external_campaign_id).replace("demo_", ""), r.id]),
      );

      // Ad sets + creatives
      const adSets: any[] = [];
      DEMO_CAMPAIGNS.forEach((c) => {
        DEMO_AD_SETS(c.key).forEach((name, i) => {
          adSets.push({
            workspace_id: workspaceId,
            campaign_id: campByKey[c.key],
            name,
            status: i === 2 && c.status !== "active" ? "paused" : "active",
            budget_amount: Math.round((c.budget / 3) * 100) / 100,
            targeting_summary: c.audience,
            spend: Math.round(c.budget * 8 * (1 - i * 0.2)),
            impressions: Math.round(c.budget * 900 * (1 - i * 0.2)),
            clicks: Math.round(c.budget * 14 * (1 - i * 0.2)),
            leads: Math.round(c.budget * 1.2 * (1 - i * 0.2)),
            is_demo: true,
          });
        });
      });
      const { data: setRows, error: setErr } = await db
        .from("ad_ad_sets").insert(adSets).select("id, campaign_id");
      if (setErr) throw setErr;

      const creatives = (setRows ?? []).flatMap((s: any, i: number) => ([{
        workspace_id: workspaceId,
        campaign_id: s.campaign_id,
        ad_set_id: s.id,
        name: ["Hero video 15s", "Carousel — 3 benefits", "Static — social proof"][i % 3],
        format: ["video", "carousel", "image"][i % 3],
        headline: ["Automate your marketing in minutes", "Turn clicks into booked calls", "One platform, every channel"][i % 3],
        body: "NexusFlo24 captures, nurtures and converts leads automatically.",
        destination_url: "https://nexusflo24.com/pricing",
        status: "active",
        spend: 120 + (i % 5) * 40,
        impressions: 14000 + (i % 5) * 3200,
        clicks: 260 + (i % 5) * 45,
        leads: 18 + (i % 5) * 4,
        is_demo: true,
      }]));
      const { error: creErr } = await db.from("ad_creatives").insert(creatives);
      if (creErr) throw creErr;

      // Daily metrics — chunked to keep payloads small.
      const metrics = buildDemoMetrics().map((m) => ({
        workspace_id: workspaceId,
        campaign_id: campByKey[m.campaignKey],
        ad_account_id: accByProvider[m.provider] ?? null,
        provider: m.provider,
        date: m.date,
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        leads: m.leads,
        qualified_leads: m.qualified_leads,
        appointments: m.appointments,
        won_deals: m.won_deals,
        revenue: m.revenue,
        is_demo: true,
      }));
      for (let i = 0; i < metrics.length; i += 400) {
        const { error } = await db.from("ad_metrics_daily").insert(metrics.slice(i, i + 400));
        if (error) throw error;
      }

      const campaignNameByKey = Object.fromEntries(DEMO_CAMPAIGNS.map((c) => [c.key, c.name]));
      const attribution = buildDemoLeads().map((l) => ({
        workspace_id: workspaceId,
        lead_id: null,
        lead_name: l.name,
        lead_email: l.email,
        provider: l.provider,
        channel: l.provider,
        source: "paid_ads",
        campaign_id: campByKey[l.campaignKey],
        campaign_name: campaignNameByKey[l.campaignKey],
        ad_set_name: l.ad_set_name,
        creative_name: l.creative_name,
        utm_source: l.utm_source,
        utm_medium: l.utm_medium,
        utm_campaign: l.utm_campaign,
        landing_page: l.landing_page,
        first_touch_at: l.first_touch_at,
        last_touch_at: l.last_touch_at,
        touch_count: l.touch_count,
        is_qualified: l.is_qualified,
        has_appointment: l.has_appointment,
        deal_status: l.deal_status,
        cost_per_lead: l.cost_per_lead,
        revenue_attributed: l.revenue_attributed,
        is_demo: true,
      }));
      const { error: attErr } = await db.from("ad_lead_attribution").insert(attribution);
      if (attErr) throw attErr;

      await db.from("ad_sync_logs").insert({
        workspace_id: workspaceId,
        provider: "meta",
        status: "success",
        records_synced: metrics.length,
        message: "Sample data generated for preview",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        is_demo: true,
      });

      return { campaigns: campaigns.length, metrics: metrics.length, leads: attribution.length };
    },
    onSuccess: (res) => {
      invalidate(qc);
      toast.success(`Sample data ready — ${res.campaigns} campaigns and ${res.leads} ad leads`);
    },
    onError: (e: any) => toast.error(e.message || "Could not create sample data"),
  });
}

async function clearDemo(workspaceId: string) {
  const tables = [
    "ad_metrics_daily", "ad_lead_attribution", "ad_creatives", "ad_ad_sets",
    "ad_campaigns", "ad_accounts", "ad_sync_logs", "ad_connections",
  ];
  for (const table of tables) {
    await db.from(table).delete().eq("workspace_id", workspaceId).eq("is_demo", true);
  }
}

/** Remove every demo row from the workspace. */
export function useClearAdsDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => clearDemo(workspaceId),
    onSuccess: () => {
      invalidate(qc);
      toast.success("Sample data removed");
    },
    onError: (e: any) => toast.error(e.message || "Could not remove sample data"),
  });
}
