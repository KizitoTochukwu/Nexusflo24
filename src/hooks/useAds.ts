import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { iso, type MetricRow, type ResolvedRange } from "@/lib/ads/metrics";
import type { AdProvider } from "@/lib/ads/constants";

/** Untyped table access — Ads Hub tables are new and not in the generated types yet. */
const db = supabase as any;

export type AdConnection = {
  id: string;
  workspace_id: string;
  provider: AdProvider;
  status: "connected" | "needs_attention" | "disconnected" | "pending";
  business_name: string | null;
  external_business_id: string | null;
  scopes: string[];
  token_expires_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type AdAccount = {
  id: string;
  workspace_id: string;
  connection_id: string | null;
  provider: AdProvider;
  external_account_id: string;
  name: string;
  currency: string;
  status: string;
  default_pipeline_id: string | null;
  default_owner_id: string | null;
  is_enabled: boolean;
  is_demo: boolean;
  last_sync_at: string | null;
};

export type AdCampaign = {
  id: string;
  workspace_id: string;
  ad_account_id: string | null;
  provider: AdProvider;
  external_campaign_id: string;
  name: string;
  status: "active" | "paused" | "draft" | "ended";
  objective: string | null;
  sub_channel: string | null;
  budget_amount: number;
  budget_type: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  audience_summary: Record<string, unknown>;
  external_url: string | null;
  is_demo: boolean;
  last_synced_at: string | null;
};

export type AdSet = {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  budget_amount: number;
  targeting_summary: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
};

export type AdCreative = {
  id: string;
  campaign_id: string;
  ad_set_id: string | null;
  name: string;
  format: string | null;
  headline: string | null;
  body: string | null;
  thumbnail_url: string | null;
  destination_url: string | null;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
};

export type AdAttributionRow = {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  provider: AdProvider | null;
  channel: string | null;
  source: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_set_name: string | null;
  creative_name: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  first_touch_at: string | null;
  last_touch_at: string | null;
  touch_count: number;
  is_qualified: boolean;
  has_appointment: boolean;
  deal_status: string | null;
  cost_per_lead: number;
  revenue_attributed: number;
  is_demo: boolean;
  created_at: string;
};

export type AdSyncLog = {
  id: string;
  provider: AdProvider;
  status: "running" | "success" | "partial" | "failed";
  records_synced: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
};

/** Tables may not exist yet while the backend migration is pending — fail soft. */
function soft<T>(fallback: T) {
  return (error: unknown): T => {
    console.warn("Ads Hub query failed:", error);
    return fallback;
  };
}

export function useAdConnections(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-connections", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_connections")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) return soft<AdConnection[]>([])(error);
      return (data ?? []) as AdConnection[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAdAccounts(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-accounts", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) return soft<AdAccount[]>([])(error);
      return (data ?? []) as AdAccount[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAdCampaigns(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-campaigns", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_campaigns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) return soft<AdCampaign[]>([])(error);
      return (data ?? []) as AdCampaign[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAdCampaign(campaignId?: string) {
  return useQuery({
    queryKey: ["ad-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) return soft<AdCampaign | null>(null)(error);
      return (data ?? null) as AdCampaign | null;
    },
    enabled: !!campaignId,
  });
}

export function useAdSets(campaignId?: string) {
  return useQuery({
    queryKey: ["ad-sets", campaignId],
    queryFn: async () => {
      const { data, error } = await db.from("ad_ad_sets").select("*").eq("campaign_id", campaignId);
      if (error) return soft<AdSet[]>([])(error);
      return (data ?? []) as AdSet[];
    },
    enabled: !!campaignId,
  });
}

export function useAdCreatives(campaignId?: string) {
  return useQuery({
    queryKey: ["ad-creatives", campaignId],
    queryFn: async () => {
      const { data, error } = await db.from("ad_creatives").select("*").eq("campaign_id", campaignId);
      if (error) return soft<AdCreative[]>([])(error);
      return (data ?? []) as AdCreative[];
    },
    enabled: !!campaignId,
  });
}

/** Daily metrics for a window. Pass the resolved range so the previous period loads too. */
export function useAdMetrics(workspaceId: string, range: ResolvedRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-metrics", workspaceId, iso(range.prevFrom), iso(range.to)],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_metrics_daily")
        .select("date, provider, campaign_id, ad_account_id, spend, impressions, clicks, leads, qualified_leads, appointments, won_deals, revenue")
        .eq("workspace_id", workspaceId)
        .gte("date", iso(range.prevFrom))
        .lte("date", iso(range.to));
      if (error) return soft<MetricRow[]>([])(error);
      return (data ?? []) as MetricRow[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCampaignMetrics(campaignId?: string) {
  return useQuery({
    queryKey: ["ad-campaign-metrics", campaignId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_metrics_daily")
        .select("date, provider, campaign_id, ad_account_id, spend, impressions, clicks, leads, qualified_leads, appointments, won_deals, revenue")
        .eq("campaign_id", campaignId)
        .order("date");
      if (error) return soft<MetricRow[]>([])(error);
      return (data ?? []) as MetricRow[];
    },
    enabled: !!campaignId,
  });
}

export function useAdAttribution(workspaceId: string, campaignId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-attribution", workspaceId, campaignId ?? "all"],
    queryFn: async () => {
      let q = db
        .from("ad_lead_attribution")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) return soft<AdAttributionRow[]>([])(error);
      return (data ?? []) as AdAttributionRow[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAdSyncLogs(workspaceId: string) {
  return useQuery({
    queryKey: ["ad-sync-logs", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ad_sync_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) return soft<AdSyncLog[]>([])(error);
      return (data ?? []) as AdSyncLog[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertAdConnection() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<AdConnection> & { workspace_id: string; provider: AdProvider }) => {
      const { data, error } = await db
        .from("ad_connections")
        .upsert({ ...payload, created_by: user?.id }, { onConflict: "workspace_id,provider" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as AdConnection;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-connections"] }),
    onError: (e: any) => toast.error(e.message || "Could not update the connection"),
  });
}

export function useDisconnectAdConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("ad_connections")
        .update({ status: "disconnected", credentials_encrypted: null, business_name: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-connections"] });
      toast.success("Account disconnected");
    },
    onError: (e: any) => toast.error(e.message || "Could not disconnect"),
  });
}

export function useUpdateAdAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdAccount> & { id: string }) => {
      const { error } = await db.from("ad_accounts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-accounts"] }),
    onError: (e: any) => toast.error(e.message || "Could not update the ad account"),
  });
}

export function useSyncAdConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workspaceId: string; provider: AdProvider }) => {
      const { data, error } = await supabase.functions.invoke("ads-sync", {
        body: { workspace_id: params.workspaceId, provider: params.provider },
      });
      if (error) throw error;
      return data as { ok: boolean; message?: string; records?: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ad-connections"] });
      qc.invalidateQueries({ queryKey: ["ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["ad-metrics"] });
      qc.invalidateQueries({ queryKey: ["ad-sync-logs"] });
      toast.success(data?.message || "Sync complete");
    },
    onError: (e: any) => toast.error(e.message || "Sync failed"),
  });
}

export function useStartAdOAuth() {
  return useMutation({
    mutationFn: async (params: { workspaceId: string; provider: AdProvider }) => {
      const { data, error } = await supabase.functions.invoke("ads-oauth-start", {
        body: {
          workspace_id: params.workspaceId,
          provider: params.provider,
          redirect_to: `${window.location.origin}/dashboard/${params.workspaceId}/ads/accounts`,
        },
      });
      if (error) throw error;
      return data as { authorize_url?: string; configured: boolean; message?: string };
    },
  });
}
