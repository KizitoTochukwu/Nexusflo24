import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HotLeadPrefs {
  hot_lead_sms_enabled: boolean;
  hot_lead_whatsapp_enabled: boolean;
  hot_lead_notify_phone: string | null;
}

export function useHotLeadPrefs(workspaceId: string) {
  return useQuery({
    queryKey: ["hot-lead-prefs", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<HotLeadPrefs> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("hot_lead_sms_enabled, hot_lead_whatsapp_enabled, hot_lead_notify_phone")
        .eq("id", workspaceId)
        .single();
      if (error) throw error;
      return data as HotLeadPrefs;
    },
  });
}

export function useUpdateHotLeadPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      patch,
    }: {
      workspaceId: string;
      patch: Partial<HotLeadPrefs>;
    }) => {
      const { error } = await supabase
        .from("workspaces")
        .update(patch)
        .eq("id", workspaceId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hot-lead-prefs", vars.workspaceId] });
    },
  });
}
