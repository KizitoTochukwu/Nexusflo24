import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Contact } from "@/hooks/useContacts";

export type EnrolmentEligibility = {
  automationId: string;
  name: string;
  status: string;
  eligible: boolean;
  /** Specific, user-readable reason when not eligible. */
  reason: string | null;
  /** Channels the automation will use, derived from its steps. */
  channels: string[];
  /** True when the contact currently has an in-flight run. */
  active: boolean;
  lastRunAt: string | null;
  reenrollmentMode: string;
};

const CHANNEL_ACTIONS: Record<string, string> = {
  send_email: "email",
  send_sms: "sms",
  send_whatsapp: "whatsapp",
};

/**
 * Enrolment is contact-driven: the execution engine still runs on a lead row,
 * so we resolve (or create) the lead that represents this contact.
 */
export function useContactLinkedLead(workspaceId: string, contact: Contact | null | undefined) {
  return useQuery({
    queryKey: ["contact-linked-lead", workspaceId, contact?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, email, phone, tags, status")
        .eq("workspace_id", workspaceId)
        .eq("contact_id" as any, contact!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as any;
      if (contact?.origin_lead_id) {
        const { data: legacy } = await supabase
          .from("leads")
          .select("id, email, phone, tags, status")
          .eq("id", contact.origin_lead_id)
          .maybeSingle();
        return (legacy as any) ?? null;
      }
      return null;
    },
    enabled: !!workspaceId && !!contact?.id,
  });
}

/**
 * Reports, per active automation, whether this contact can be enrolled and the
 * exact blocking reason when not. Nothing is sent by evaluating eligibility.
 */
export function useContactEnrolmentEligibility(workspaceId: string, contact: Contact | null | undefined) {
  const { data: lead } = useContactLinkedLead(workspaceId, contact);

  return useQuery({
    queryKey: ["contact-enrolment-eligibility", workspaceId, contact?.id, lead?.id ?? null],
    queryFn: async (): Promise<EnrolmentEligibility[]> => {
      const [{ data: automations, error: aErr }, { data: steps, error: sErr }] = await Promise.all([
        supabase.from("automations").select("*").eq("workspace_id", workspaceId),
        supabase.from("automation_steps").select("automation_id, step_type, config"),
      ]);
      if (aErr) throw aErr;
      if (sErr) throw sErr;

      const rows = (automations ?? []) as any[];
      const ids = rows.map((a) => a.id);

      // In-flight / historical runs for this contact's lead.
      let logsByAutomation = new Map<string, { last: string; active: boolean }>();
      if (lead?.id && ids.length) {
        const { data: logs } = await supabase
          .from("automation_logs")
          .select("automation_id, status, created_at")
          .eq("lead_id", lead.id)
          .in("automation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500);
        for (const l of (logs ?? []) as any[]) {
          const prev = logsByAutomation.get(l.automation_id);
          const isActive = ["pending", "scheduled", "running", "waiting"].includes(String(l.status));
          logsByAutomation.set(l.automation_id, {
            last: prev?.last ?? l.created_at,
            active: (prev?.active ?? false) || isActive,
          });
        }
      }

      const stepsByAutomation = new Map<string, any[]>();
      for (const s of (steps ?? []) as any[]) {
        const arr = stepsByAutomation.get(s.automation_id) ?? [];
        arr.push(s);
        stepsByAutomation.set(s.automation_id, arr);
      }

      const optedOut = contact?.consent_status === "opted_out";

      return rows.map((a) => {
        const mySteps = stepsByAutomation.get(a.id) ?? [];
        const channels = Array.from(
          new Set(
            mySteps
              .map((s) => CHANNEL_ACTIONS[String((s.config as any)?.action ?? s.step_type ?? "")])
              .filter(Boolean),
          ),
        );
        const run = logsByAutomation.get(a.id);
        const reenrollmentMode = String(a.reenrollment_config?.mode ?? "never");

        let reason: string | null = null;
        if (a.status !== "active") reason = "This automation is not active. Activate it first.";
        else if (mySteps.length === 0) reason = "This automation has no steps yet.";
        else if (optedOut) reason = "This contact has opted out of marketing messages.";
        else if (run?.active) reason = "This contact is already running in this automation.";
        else if (run && reenrollmentMode === "never") reason = "Already enrolled once and re-enrolment is turned off.";
        else if (channels.includes("email") && !contact?.email) reason = "This automation sends email but the contact has no email address.";
        else if (channels.includes("sms") && !contact?.phone) reason = "This automation sends SMS but the contact has no phone number.";
        else if (channels.includes("whatsapp") && !(contact?.whatsapp_number || contact?.phone))
          reason = "This automation sends WhatsApp but the contact has no WhatsApp number.";

        return {
          automationId: a.id,
          name: a.name,
          status: a.status,
          eligible: !reason,
          reason,
          channels,
          active: !!run?.active,
          lastRunAt: run?.last ?? null,
          reenrollmentMode,
        };
      });
    },
    enabled: !!workspaceId && !!contact?.id,
  });
}

/**
 * Enrols a contact, creating the backing lead record when the contact has none
 * (e.g. contacts created from a booking or a commerce order).
 */
export function useEnrolContact(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contact, automationId }: { contact: Contact; automationId: string }) => {
      let leadId: string | null = null;

      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id" as any, contact.id)
        .limit(1)
        .maybeSingle();
      leadId = (existing as any)?.id ?? contact.origin_lead_id ?? null;

      if (!leadId) {
        const { data: created, error: createErr } = await supabase
          .from("leads")
          .insert({
            workspace_id: workspaceId,
            contact_id: contact.id,
            full_name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Contact",
            email: contact.email,
            phone: contact.phone,
            source: "crm_manual",
            status: "New",
          } as any)
          .select("id")
          .maybeSingle();
        if (createErr) throw createErr;
        leadId = (created as any)?.id ?? null;
      }
      if (!leadId) throw new Error("Could not resolve a lead record for this contact");

      const { data, error } = await supabase.functions.invoke("execute-automation", {
        body: { automation_id: automationId, lead_id: leadId, workspace_id: workspaceId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return { leadId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-enrolment-eligibility"] });
      qc.invalidateQueries({ queryKey: ["contact-linked-lead"] });
      toast.success("Contact enrolled");
    },
    onError: (e: any) => toast.error(e.message || "Failed to enrol contact"),
  });
}
