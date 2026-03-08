import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AiQualification = {
  verdict: "hot" | "warm" | "cold" | "not_qualified";
  confidence: number;
  reasoning: string;
  recommended_action: string;
  qualified_at: string;
};

export function useQualifyLead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, workspaceId }: { leadId: string; workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("qualify-lead", {
        body: { lead_id: leadId, workspace_id: workspaceId },
      });

      if (error) {
        // Check for rate limit / payment errors from the response
        const msg = (data as any)?.error || error.message || "Qualification failed";
        throw new Error(msg);
      }

      return data.qualification as AiQualification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-activities"] });
      toast.success("Lead qualified by AI");
    },
    onError: (e: Error) => toast.error(e.message || "AI qualification failed"),
  });
}
