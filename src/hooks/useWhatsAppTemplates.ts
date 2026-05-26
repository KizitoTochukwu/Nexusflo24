import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WhatsAppTemplate = {
  id: string;
  workspace_id: string;
  name: string;
  language: string;
  category: string;
  body_preview: string;
  variable_count: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** All workspace templates (any status). */
export function useWhatsAppTemplates(workspaceId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WhatsAppTemplate[];
    },
  });
}

/** Approved templates only — what's safe to send right now. */
export function useApprovedWhatsAppTemplates(workspaceId: string | null) {
  const q = useWhatsAppTemplates(workspaceId);
  return {
    ...q,
    data: (q.data ?? []).filter((t) => t.status === "approved"),
  };
}

export type WhatsAppSettings = {
  id: string;
  workspace_id: string;
  phone_number_id: string;
  is_active: boolean;
  default_reengagement_template_id: string | null;
};

export function useWhatsAppSettings(workspaceId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-settings-row", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_settings")
        .select("id, workspace_id, phone_number_id, is_active, default_reengagement_template_id")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as WhatsAppSettings | null;
    },
  });
}

export function useUpdateDefaultReengagementTemplate(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string | null) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("whatsapp_settings")
        .update({ default_reengagement_template_id: templateId })
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-settings-row", workspaceId] });
      toast.success("Default re-engagement template saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });
}
