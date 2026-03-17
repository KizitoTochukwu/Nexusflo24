import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppThread {
  phone_number: string;
  lead_id: string | null;
  lead_name: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

export function useWhatsAppThreads(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["whatsapp-threads", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 10000,
    queryFn: async () => {
      // Get all messages grouped by phone_number
      const { data: messages, error } = await supabase
        .from("whatsapp_messages")
        .select("phone_number, body, direction, created_at, lead_id, status")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Group by phone_number
      const threadMap = new Map<string, {
        phone_number: string;
        lead_id: string | null;
        last_message: string | null;
        last_message_at: string;
        unread_count: number;
      }>();

      for (const msg of messages || []) {
        if (!threadMap.has(msg.phone_number)) {
          threadMap.set(msg.phone_number, {
            phone_number: msg.phone_number,
            lead_id: msg.lead_id,
            last_message: msg.body,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        if (msg.direction === "inbound" && msg.status === "received") {
          const t = threadMap.get(msg.phone_number)!;
          t.unread_count++;
        }
      }

      const threads = Array.from(threadMap.values());

      // Fetch lead names
      const leadIds = threads.map(t => t.lead_id).filter(Boolean) as string[];
      let leadMap = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, full_name")
          .in("id", leadIds);
        for (const l of leads || []) {
          leadMap.set(l.id, l.full_name || "");
        }
      }

      return threads
        .map(t => ({
          ...t,
          lead_name: t.lead_id ? leadMap.get(t.lead_id) || null : null,
        }))
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()) as WhatsAppThread[];
    },
  });
}

export function useWhatsAppMessages(workspaceId: string | undefined, phoneNumber: string | null) {
  return useQuery({
    queryKey: ["whatsapp-messages", workspaceId, phoneNumber],
    enabled: !!workspaceId && !!phoneNumber,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("phone_number", phoneNumber!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });
}
