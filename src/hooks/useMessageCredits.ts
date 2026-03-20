import { useQuery } from "@tanstack/react-query";
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

  return useQuery({
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
  });
}
