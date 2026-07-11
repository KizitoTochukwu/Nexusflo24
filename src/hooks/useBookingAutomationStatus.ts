import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingAutomationStatus = {
  emailConfirmation: boolean;
  whatsappReminder: boolean;
  crmPipeline: boolean;
};

/**
 * Detects which automations reference booking events for the workspace.
 * Returns aggregate flags (any active automation of that kind counts).
 */
export function useBookingAutomationStatus(workspaceId: string | null) {
  return useQuery({
    queryKey: ["booking-automation-status", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<BookingAutomationStatus> => {
      const { data: automations } = await supabase
        .from("automations")
        .select("id, trigger_type, status")
        .eq("workspace_id", workspaceId!)
        .eq("trigger_type", "book_appointment")
        .eq("status", "active");

      const automationIds = (automations ?? []).map((a) => a.id);
      if (automationIds.length === 0) {
        return { emailConfirmation: true, whatsappReminder: false, crmPipeline: true };
      }

      const { data: steps } = await supabase
        .from("automation_steps")
        .select("automation_id, step_type, config")
        .in("automation_id", automationIds)
        .eq("step_type", "action");

      let email = false;
      let whatsapp = false;
      for (const s of steps ?? []) {
        const cfg = (s.config ?? {}) as Record<string, unknown>;
        const type = (cfg.action_type ?? cfg.type ?? cfg.channel) as string | undefined;
        if (typeof type === "string") {
          const t = type.toLowerCase();
          if (t.includes("email")) email = true;
          if (t.includes("whatsapp") || t.includes("wa")) whatsapp = true;
        }
      }

      return {
        emailConfirmation: email || true, // confirmation email always sent by booking flow
        whatsappReminder: whatsapp,
        crmPipeline: true,
      };
    },
  });
}
