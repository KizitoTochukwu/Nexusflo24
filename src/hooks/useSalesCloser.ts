import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SalesConversation = {
  id: string;
  workspace_id: string;
  lead_id: string;
  channel: string;
  direction: "inbound" | "outbound";
  message_body: string;
  intent: string | null;
  intent_confidence: number | null;
  ai_generated: boolean;
  ai_model: string | null;
  status: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type SalesCloserSettings = {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  mode: "auto_send" | "human_approval";
  channels: string[];
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  max_follow_ups: number;
  booking_page_id: string | null;
  system_prompt: string;
  escalation_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function useSalesConversations(leadId: string | null, workspaceId: string) {
  return useQuery({
    queryKey: ["sales-conversations", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("sales_conversations")
        .select("*")
        .eq("lead_id", leadId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SalesConversation[];
    },
    enabled: !!leadId && !!workspaceId,
  });
}

export function useSalesCloserSettings(workspaceId: string) {
  return useQuery({
    queryKey: ["sales-closer-settings", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_closer_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as SalesCloserSettings | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertSalesCloserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<SalesCloserSettings> & { workspace_id: string }) => {
      const { data: existing } = await supabase
        .from("sales_closer_settings")
        .select("id")
        .eq("workspace_id", settings.workspace_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("sales_closer_settings")
          .update({ ...settings, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sales_closer_settings")
          .insert(settings as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-closer-settings", vars.workspace_id] });
      toast.success("AI Sales Closer settings saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save settings"),
  });
}

export function useProcessInbound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      lead_id: string;
      message: string;
      channel: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-sales-closer", {
        body: { action: "process_inbound", ...params },
      });
      if (error) throw error;
      return data as { intent: string; confidence: number; reply: string; status: string };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-conversations", vars.lead_id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to process message"),
  });
}

export function useGenerateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      lead_id: string;
      channel: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-sales-closer", {
        body: { action: "generate_follow_up", ...params },
      });
      if (error) throw error;
      return data as { reply: string; status: string };
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-conversations", vars.lead_id] });
      toast.success("Follow-up generated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate follow-up"),
  });
}

export function useApproveMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, leadId }: { messageId: string; leadId: string }) => {
      const { error } = await supabase
        .from("sales_conversations")
        .update({ status: "sent" } as any)
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-conversations", vars.leadId] });
      toast.success("Message approved and sent");
    },
  });
}
