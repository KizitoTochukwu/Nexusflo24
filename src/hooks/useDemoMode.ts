import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DemoVariant } from "@/lib/demo/demoData";

export interface DemoModeSettings {
  demo_mode_enabled: boolean;
  demo_seed_variant: DemoVariant;
}

export function useDemoMode(workspaceId: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["demo-mode", workspaceId],
    queryFn: async (): Promise<DemoModeSettings> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("demo_mode_enabled, demo_seed_variant")
        .eq("id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return {
        demo_mode_enabled: (data as any)?.demo_mode_enabled ?? false,
        demo_seed_variant: ((data as any)?.demo_seed_variant ?? "default") as DemoVariant,
      };
    },
    enabled: !!user && !!workspaceId,
  });

  return query;
}

export function useUpdateDemoMode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      demo_mode_enabled,
      demo_seed_variant,
    }: {
      workspaceId: string;
      demo_mode_enabled: boolean;
      demo_seed_variant: string;
    }) => {
      const { error } = await supabase
        .from("workspaces")
        .update({
          demo_mode_enabled,
          demo_seed_variant,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", workspaceId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["demo-mode", vars.workspaceId] });
    },
  });
}
