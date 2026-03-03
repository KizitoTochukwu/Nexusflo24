import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailStatus(workspaceId: string) {
  return useQuery({
    queryKey: ["email-status", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_settings" as any)
        .select("id, provider, is_active")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return { configured: !!data, provider: (data as any)?.provider || null };
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
