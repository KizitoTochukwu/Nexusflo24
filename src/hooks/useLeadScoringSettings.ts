import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_BANDS,
  DEFAULT_DECAY,
  DEFAULT_RULES,
  LeadScoringConfig,
  ScoringBands,
  ScoringDecay,
  ScoringRules,
} from "@/lib/crm/leadScoring";

export function useLeadScoringSettings(workspaceId: string) {
  return useQuery({
    queryKey: ["lead-scoring-settings", workspaceId],
    queryFn: async (): Promise<LeadScoringConfig> => {
      const { data, error } = await supabase
        .from("lead_scoring_settings")
        .select("rules, bands, decay, custom_labels")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;

      const rules = { ...DEFAULT_RULES, ...((data?.rules as ScoringRules) ?? {}) };
      const bands = { ...DEFAULT_BANDS, ...((data?.bands as Partial<ScoringBands>) ?? {}) };
      const decay = { ...DEFAULT_DECAY, ...((data?.decay as Partial<ScoringDecay>) ?? {}) };
      const custom_labels = (data?.custom_labels as Record<string, string>) ?? {};
      return { rules, bands, decay, custom_labels };
    },
    enabled: !!workspaceId,
  });
}

export function useSaveLeadScoringSettings(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: LeadScoringConfig) => {
      const { error } = await supabase
        .from("lead_scoring_settings")
        .upsert(
          {
            workspace_id: workspaceId,
            rules: config.rules,
            bands: config.bands,
            decay: config.decay,
            custom_labels: config.custom_labels,
          },
          { onConflict: "workspace_id" },
        );
      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-scoring-settings", workspaceId] });
      toast.success("Lead scoring saved");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not save lead scoring");
    },
  });
}
