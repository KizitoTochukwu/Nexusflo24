import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SmsThread {
  to_number: string;
  contact_id: string | null;
  contact_name: string | null;
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
        .select("to_number, message, created_at, status, contact_id")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const threadMap = new Map<string, {
        to_number: string;
        contact_id: string | null;
        last_message: string | null;
        last_message_at: string;
        count: number;
      }>();

      for (const msg of data || []) {
        if (!threadMap.has(msg.to_number)) {
          threadMap.set(msg.to_number, {
            to_number: msg.to_number,
            contact_id: msg.contact_id ?? null,
            last_message: msg.message,
            last_message_at: msg.created_at,
            count: 0,
          });
        } else if (!threadMap.get(msg.to_number)!.contact_id && msg.contact_id) {
          threadMap.get(msg.to_number)!.contact_id = msg.contact_id;
        }
        threadMap.get(msg.to_number)!.count++;
      }

      const threads = Array.from(threadMap.values());
      const contactIds = threads.map(t => t.contact_id).filter(Boolean) as string[];
      const contactMap = new Map<string, string>();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, full_name")
          .in("id", contactIds);
        for (const c of contacts || []) {
          contactMap.set(c.id, c.full_name || "");
        }
      }

      return threads
        .map(t => ({ ...t, contact_name: t.contact_id ? contactMap.get(t.contact_id) || null : null }))
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
