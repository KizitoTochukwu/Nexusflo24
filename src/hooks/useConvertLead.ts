import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Turns a lead into a CRM contact. Server-side RPC merges into an existing
 * contact when the same email or phone already exists in the workspace.
 */
export function useConvertLeadToContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("convert_lead_to_contact" as any, { _lead_id: leadId });
      if (error) throw error;
      if (!data) throw new Error("Lead could not be converted.");
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact-stats"] });
      toast.success("Lead converted to contact");
    },
    onError: (e: any) => toast.error(e.message || "Conversion failed"),
  });
}
