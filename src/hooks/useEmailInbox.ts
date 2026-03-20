import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailThread {
  to_email: string;
  lead_id: string | null;
  lead_name: string | null;
  last_subject: string | null;
  last_message_at: string;
  count: number;
}

export function useEmailThreads(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["email-threads", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("to_email, subject, direction, created_at, lead_id, status")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const threadMap = new Map<string, {
        to_email: string;
        lead_id: string | null;
        last_subject: string | null;
        last_message_at: string;
        count: number;
      }>();

      for (const msg of data || []) {
        if (!threadMap.has(msg.to_email)) {
          threadMap.set(msg.to_email, {
            to_email: msg.to_email,
            lead_id: msg.lead_id,
            last_subject: msg.subject,
            last_message_at: msg.created_at,
            count: 0,
          });
        }
        threadMap.get(msg.to_email)!.count++;
      }

      const threads = Array.from(threadMap.values());

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
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()) as EmailThread[];
    },
  });
}

export function useEmailMessages(workspaceId: string | undefined, toEmail: string | null) {
  return useQuery({
    queryKey: ["email-messages", workspaceId, toEmail],
    enabled: !!workspaceId && !!toEmail,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("to_email", toEmail!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });
}
