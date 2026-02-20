import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Campaign = {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  type: string;
  objective: string;
  status: string;
  audience_filter: Record<string, unknown>;
  message_content: Record<string, unknown>;
  scheduled_at: string | null;
  sent_count: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
};

export type CampaignMessage = {
  id: string;
  campaign_id: string;
  workspace_id: string;
  lead_id: string | null;
  channel: string;
  delivery_status: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  created_at: string;
};

export const CAMPAIGN_TYPES = ["email", "whatsapp", "sms", "multi-channel"] as const;
export const CAMPAIGN_OBJECTIVES = ["lead generation", "promotion", "nurture", "event", "broadcast"] as const;
export const CAMPAIGN_STATUSES = ["draft", "scheduled", "active", "paused", "completed"] as const;

export function useCampaigns(workspaceId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCampaignById(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignMessages(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign-messages", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignMessage[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (campaign: Partial<Campaign> & { workspace_id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...campaign, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create campaign"),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update campaign"),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete campaign"),
  });
}
