import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "./useWorkspaceId";

export interface MessageCredits {
  email_balance: number;
  sms_balance: number;
  whatsapp_balance: number;
  email_used: number;
  sms_used: number;
  whatsapp_used: number;
}

export function useMessageCredits() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["message-credits", workspaceId],
    queryFn: async (): Promise<MessageCredits | null> => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("message_credits")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as MessageCredits | null;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  // Realtime subscription — instant updates when credits change or transactions are logged
  useEffect(() => {
    if (!workspaceId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["message-credits", workspaceId] });
    };

    const channel = supabase
      .channel(`message-credits-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_credits",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_transactions",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return query;
}
