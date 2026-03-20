import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SmsThread {
  to_number: string;
  last_message: string | null;
  last_message_at: string;
  count: number;
}

export function useSmsThreads(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["sms-threads", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("to_number, message, created_at, status")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const threadMap = new Map<string, {
        to_number: string;
        last_message: string | null;
        last_message_at: string;
        count: number;
      }>();

      for (const msg of data || []) {
        if (!threadMap.has(msg.to_number)) {
          threadMap.set(msg.to_number, {
            to_number: msg.to_number,
            last_message: msg.message,
            last_message_at: msg.created_at,
            count: 0,
          });
        }
        threadMap.get(msg.to_number)!.count++;
      }

      return Array.from(threadMap.values())
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()) as SmsThread[];
    },
  });
}

export function useSmsMessages(workspaceId: string | undefined, toNumber: string | null) {
  return useQuery({
    queryKey: ["sms-messages", workspaceId, toNumber],
    enabled: !!workspaceId && !!toNumber,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("to_number", toNumber!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });
}
