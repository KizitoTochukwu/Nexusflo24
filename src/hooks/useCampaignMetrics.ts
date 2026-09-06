import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { groupCampaignMetrics, type CampaignMetrics, type MetricMessage } from "@/lib/campaigns/metrics";

/**
 * Delivery-record aggregates for every campaign in a workspace.
 * Used so the campaign table, analytics tab and details drawer all read the
 * same numbers.
 */
export function useWorkspaceCampaignMetrics(workspaceId: string) {
  return useQuery({
    queryKey: ["campaign-metrics", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Record<string, CampaignMetrics>> => {
      const { data, error } = await supabase
        .from("campaign_messages")
        .select("id, campaign_id, lead_id, delivery_status, opened, clicked, replied")
        .eq("workspace_id", workspaceId)
        .limit(5000);
      if (error) throw error;
      return groupCampaignMetrics((data ?? []) as MetricMessage[]);
    },
  });
}
