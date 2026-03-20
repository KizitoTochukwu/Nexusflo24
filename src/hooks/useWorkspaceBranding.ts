import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkspaceBranding {
  id: string;
  workspace_id: string;
  logo_url: string | null;
  icon_url: string | null;
  brand_color: string;
  brand_name: string | null;
  custom_domain: string | null;
}

export function useWorkspaceBranding(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-branding", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_branding" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WorkspaceBranding | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertBranding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (branding: Partial<WorkspaceBranding> & { workspace_id: string }) => {
      const { data, error } = await supabase
        .from("workspace_branding" as any)
        .upsert(branding as any, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-branding", vars.workspace_id] });
      toast.success("Branding saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save branding"),
  });
}
