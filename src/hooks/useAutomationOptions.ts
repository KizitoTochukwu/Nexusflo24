import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AUTOMATION_TAG_OPTIONS } from "@/lib/automations/tagOptions";

/**
 * Automation selectors must offer the workspace's real CRM taxonomy, not a
 * hardcoded list. Workspace tags (crm_tags) are merged with the standard
 * starter taxonomy so existing automations keep valid values.
 */
export function useAutomationTagOptions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["automation-tag-options", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_tags" as any)
        .select("name")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });
      if (error) throw error;
      const workspaceTags = ((data ?? []) as any[]).map((t) => String(t.name)).filter(Boolean);
      return Array.from(new Set([...workspaceTags, ...AUTOMATION_TAG_OPTIONS]));
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export const FALLBACK_PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Engaged",
  "Qualified",
  "Warm",
  "Hot",
  "Won",
  "Customer",
  "Lost",
];

/**
 * Real pipeline stage names configured in CRM → Pipelines, merged with the
 * legacy lead pipeline_stage values so saved automations remain selectable.
 */
export function useAutomationStageOptions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["automation-stage-options", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipeline_stages" as any)
        .select("name, position")
        .eq("workspace_id", workspaceId!)
        .order("position", { ascending: true });
      if (error) throw error;
      const stageNames = ((data ?? []) as any[]).map((s) => String(s.name)).filter(Boolean);
      return Array.from(new Set([...stageNames, ...FALLBACK_PIPELINE_STAGES]));
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

/** Pipeline names configured in CRM → Pipelines. */
export function useAutomationPipelineOptions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["automation-pipeline-options", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines" as any)
        .select("name")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return Array.from(new Set(((data ?? []) as any[]).map((p) => String(p.name)).filter(Boolean)));
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
