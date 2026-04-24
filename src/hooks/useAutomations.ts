import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Automation = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  exit_criteria: unknown[];
  status: string;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
};

export type AutomationStep = {
  id: string;
  automation_id: string;
  workspace_id: string;
  step_order: number;
  step_type: "trigger" | "condition" | "action" | "delay";
  config: Record<string, unknown>;
  created_at: string;
};

export type AutomationLog = {
  id: string;
  automation_id: string;
  workspace_id: string;
  lead_id: string | null;
  event_type: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
};

export const TRIGGER_OPTIONS = [
  { value: "new_lead", label: "New lead created" },
  { value: "lead_added_to_folder", label: "Lead added to folder (great for CSV imports)" },
  { value: "lead_tagged", label: "Lead tagged" },
  { value: "tag_added", label: "Tag added (any tag)" },
  { value: "score_threshold", label: "Lead score threshold reached" },
  { value: "email_opened", label: "Email opened" },
  { value: "link_clicked", label: "Link clicked" },
  { value: "whatsapp_replied", label: "WhatsApp replied" },
  { value: "campaign_completed", label: "Campaign completed" },
  { value: "purchase_event", label: "Purchase event (placeholder)" },
  { value: "book_appointment", label: "Appointment booked" },
] as const;

export type ConditionInputType = "none" | "text" | "number";

export type ConditionOperator =
  | "equals" | "not_equals" | "contains" | "not_contains"
  | "greater_than" | "less_than" | "between"
  | "happened" | "not_happened" | "is_known" | "is_unknown";

export type ConditionOption = {
  value: string;
  label: string;
  input: ConditionInputType;
  placeholder?: string;
  /** Operators offered for this condition. First one is the default. */
  operators: ConditionOperator[];
  /** If true, the UI exposes the "in the last X days" time window selector. */
  timeWindow?: boolean;
  /** Suggested follow-up actions (curated mappings) shown as one-click chips. */
  suggestedActions?: { action: string; label: string; defaults?: Record<string, unknown> }[];
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  greater_than: "greater than",
  less_than: "less than",
  between: "between",
  happened: "has happened",
  not_happened: "has not happened",
  is_known: "is known",
  is_unknown: "is unknown",
};

export function operatorLabel(op: ConditionOperator): string {
  return OPERATOR_LABELS[op] ?? op;
}

export const CONDITION_GROUPS: { label: string; options: ConditionOption[] }[] = [
  {
    label: "Identity / Data",
    options: [
      {
        value: "email_known", label: "Email", input: "none",
        operators: ["is_known", "is_unknown"],
        suggestedActions: [
          { action: "send_email", label: "Send Welcome Email", defaults: { subject: "Welcome aboard 👋" } },
          { action: "add_tag", label: "Tag: email-verified", defaults: { tag: "email-verified" } },
        ],
      },
      {
        value: "phone_known", label: "Phone", input: "none",
        operators: ["is_known", "is_unknown"],
        suggestedActions: [
          { action: "send_whatsapp", label: "Send WhatsApp", defaults: { message: "Hi {{first_name}}, thanks for connecting!" } },
          { action: "send_sms", label: "Send SMS", defaults: { message: "Hi {{first_name}}, quick note from our team." } },
        ],
      },
      {
        value: "source_equals", label: "Source", input: "text", placeholder: "e.g. facebook",
        operators: ["equals", "not_equals", "contains"],
        suggestedActions: [
          { action: "add_tag", label: "Tag by source", defaults: { tag: "source-match" } },
          { action: "update_status", label: "Move to Engaged", defaults: { new_status: "Engaged" } },
          { action: "notify_sales", label: "Notify Sales" },
        ],
      },
      {
        value: "tag_contains", label: "Tag", input: "text", placeholder: "e.g. webinar",
        operators: ["contains", "not_contains", "equals"],
        suggestedActions: [
          { action: "send_email", label: "Send targeted email", defaults: { subject: "Something for you" } },
          { action: "notify_sales", label: "Notify Sales" },
          { action: "update_status", label: "Move to Warm", defaults: { new_status: "Warm" } },
        ],
      },
    ],
  },
  {
    label: "Email behaviour",
    options: [
      {
        value: "email_opened", label: "Email opened", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "send_whatsapp", label: "Follow up on WhatsApp", defaults: { message: "Hey {{first_name}}, saw you opened our email — any questions?" } },
          { action: "add_tag", label: "Tag: engaged", defaults: { tag: "engaged" } },
          { action: "send_sms", label: "Send SMS nudge", defaults: { message: "Quick reminder from our team 👋" } },
        ],
      },
      {
        value: "link_clicked", label: "Link clicked", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "notify_sales", label: "Notify Sales", defaults: { message: "Lead clicked a link — high intent" } },
          { action: "send_email", label: "Send follow-up email", defaults: { subject: "Thanks for checking that out" } },
          { action: "update_status", label: "Move to Warm", defaults: { new_status: "Warm" } },
        ],
      },
    ],
  },
  {
    label: "Funnel behaviour",
    options: [
      {
        value: "form_submitted", label: "Form submitted", input: "text", placeholder: "Funnel slug (blank = any)",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "add_tag", label: "Add to nurture flow", defaults: { tag: "nurture" } },
          { action: "send_email", label: "Send welcome email", defaults: { subject: "Thanks for signing up 🎉" } },
          { action: "notify_sales", label: "Notify Sales" },
        ],
      },
      {
        value: "checkout_visited", label: "Checkout visited", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "send_email", label: "Send discount email", defaults: { subject: "Your 10% off is inside 🎁", message: "Hi {{first_name}},\n\nWe noticed you were checking us out — here's 10% off to help you decide.\n\nUse code: SAVE10" } },
          { action: "send_whatsapp", label: "Send WhatsApp reminder", defaults: { message: "Hi {{first_name}}, your cart is still waiting — need help completing your order?" } },
          { action: "add_tag", label: "Tag: cart-abandoner", defaults: { tag: "cart-abandoner" } },
        ],
      },
      {
        value: "pricing_visited", label: "Pricing page visited / clicked", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "notify_sales", label: "Notify Sales", defaults: { message: "Lead viewed pricing — high intent" } },
          { action: "send_email", label: "Send pricing follow-up", defaults: { subject: "Questions about pricing?" } },
          { action: "update_status", label: "Mark Hot", defaults: { new_status: "Hot" } },
        ],
      },
    ],
  },
  {
    label: "Messaging behaviour",
    options: [
      {
        value: "whatsapp_replied", label: "WhatsApp replied", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "update_status", label: "Move to Engaged", defaults: { new_status: "Engaged" } },
          { action: "notify_sales", label: "Notify Sales" },
          { action: "send_whatsapp", label: "Reply on WhatsApp", defaults: { message: "Thanks for getting back, {{first_name}}!" } },
        ],
      },
    ],
  },
  {
    label: "Lead scoring",
    options: [
      {
        value: "score_gt", label: "Lead score", input: "number", placeholder: "e.g. 50",
        operators: ["greater_than", "less_than", "equals", "between"],
        suggestedActions: [
          { action: "update_status", label: "Mark Hot", defaults: { new_status: "Hot" } },
          { action: "notify_sales", label: "Notify Sales", defaults: { message: "High-score lead — please reach out" } },
          { action: "send_email", label: "Send VIP email", defaults: { subject: "A personal note from our team" } },
        ],
      },
    ],
  },
  {
    label: "Purchase / Conversion",
    options: [
      {
        value: "appointment_booked", label: "Appointment booked", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "send_email", label: "Send confirmation email", defaults: { subject: "Your appointment is confirmed ✅" } },
          { action: "send_whatsapp", label: "Send WhatsApp reminder", defaults: { message: "Hi {{first_name}}, looking forward to our meeting!" } },
          { action: "update_status", label: "Move to Qualified", defaults: { new_status: "Qualified" } },
        ],
      },
      {
        value: "purchase_happened", label: "Purchase happened", input: "none",
        operators: ["happened", "not_happened"], timeWindow: true,
        suggestedActions: [
          { action: "add_tag", label: "Tag: customer", defaults: { tag: "customer" } },
          { action: "send_email", label: "Send thank-you email", defaults: { subject: "Thank you for your purchase 🙌" } },
          { action: "update_status", label: "Mark Won", defaults: { new_status: "Won" } },
          { action: "remove_tag", label: "Remove cart-abandoner tag", defaults: { tag: "cart-abandoner" } },
        ],
      },
    ],
  },
];

// Flat list for backward compatibility + reply_status (handled separately in UI)
export const CONDITION_OPTIONS = [
  ...CONDITION_GROUPS.flatMap((g) => g.options),
  { value: "reply_status", label: "Reply status", input: "none" as ConditionInputType },
] as const;

export const REPLY_STATUS_OPTIONS = [
  { value: "has_replied", label: "Lead has replied" },
  { value: "no_reply", label: "Lead has not replied" },
] as const;

export const ACTION_OPTIONS = [
  { value: "send_email", label: "Send Email", icon: "Mail" },
  { value: "send_whatsapp", label: "Send WhatsApp", icon: "MessageCircle" },
  { value: "send_sms", label: "Send SMS", icon: "Smartphone" },
  { value: "add_tag", label: "Add Tag", icon: "Tag" },
  { value: "remove_tag", label: "Remove Tag", icon: "XCircle" },
  { value: "update_status", label: "Update Lead Status", icon: "RefreshCw" },
  { value: "notify_sales", label: "Notify Sales", icon: "Bell" },
  { value: "delay", label: "Wait / Delay", icon: "Clock" },
] as const;

export function useAutomations(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["automations", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Automation[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAutomationSteps(automationId: string | null) {
  return useQuery({
    queryKey: ["automation-steps", automationId],
    queryFn: async () => {
      if (!automationId) return [];
      const { data, error } = await supabase
        .from("automation_steps")
        .select("*")
        .eq("automation_id", automationId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AutomationStep[];
    },
    enabled: !!automationId,
  });
}

export function useAutomationLogs(automationId: string | null) {
  return useQuery({
    queryKey: ["automation-logs", automationId],
    queryFn: async () => {
      if (!automationId) return [];
      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .eq("automation_id", automationId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AutomationLog[];
    },
    enabled: !!automationId,
  });
}

export type EmailDelivery = {
  id: string;
  lead_id: string | null;
  to_email: string;
  status: string;
  error: string | null;
  provider_message_id: string | null;
  subject: string | null;
  created_at: string;
};

/**
 * Fetch recent outbound email_logs rows for the leads that have run through
 * this automation. Returned as a Map<lead_id, latest EmailDelivery> so the
 * Logs UI can correlate each `action:send_email` row with the actual provider
 * delivery status (sent / failed / queued) without N+1 queries.
 */
export function useAutomationEmailDeliveries(
  automationId: string | null,
  workspaceId: string | null,
) {
  return useQuery({
    queryKey: ["automation-email-deliveries", automationId, workspaceId],
    queryFn: async () => {
      const map = new Map<string, EmailDelivery>();
      if (!automationId || !workspaceId) return map;
      // Look at automation_logs first to figure out which leads are relevant.
      const { data: leadRows, error: leadErr } = await supabase
        .from("automation_logs")
        .select("lead_id")
        .eq("automation_id", automationId)
        .not("lead_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (leadErr) throw leadErr;
      const leadIds = Array.from(
        new Set((leadRows ?? []).map((r: any) => r.lead_id).filter(Boolean)),
      );
      if (leadIds.length === 0) return map;

      const { data, error } = await supabase
        .from("email_logs")
        .select("id, lead_id, to_email, status, error, provider_message_id, subject, created_at")
        .eq("workspace_id", workspaceId)
        .eq("direction", "outbound")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Keep newest row per lead.
      for (const row of (data ?? []) as any[]) {
        if (!row.lead_id) continue;
        if (!map.has(row.lead_id)) {
          map.set(row.lead_id, row as EmailDelivery);
        }
      }
      return map;
    },
    enabled: !!automationId && !!workspaceId,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; name: string; description?: string; trigger_type: string; trigger_config?: Record<string, unknown>; exit_criteria?: unknown[]; steps: { step_type: string; config: Record<string, unknown> }[] }) => {
      const { steps, ...automationData } = input;
      const { data, error } = await supabase
        .from("automations")
        .insert({ ...automationData, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      if (steps.length > 0) {
        const stepsToInsert = steps.map((s, i) => ({
          automation_id: data.id,
          workspace_id: input.workspace_id,
          step_order: i,
          step_type: s.step_type,
          config: s.config,
        }));
        const { error: stepErr } = await supabase.from("automation_steps").insert(stepsToInsert as any);
        if (stepErr) throw stepErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create automation"),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, steps, workspace_id, ...updates }: Partial<Automation> & { id: string; steps?: { step_type: string; config: Record<string, unknown> }[]; workspace_id: string; exit_criteria?: unknown[] }) => {
      const { data, error } = await supabase
        .from("automations")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (steps !== undefined) {
        await supabase.from("automation_steps").delete().eq("automation_id", id);
        if (steps.length > 0) {
          const stepsToInsert = steps.map((s, i) => ({
            automation_id: id,
            workspace_id,
            step_order: i,
            step_type: s.step_type,
            config: s.config,
          }));
          const { error: stepErr } = await supabase.from("automation_steps").insert(stepsToInsert as any);
          if (stepErr) throw stepErr;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["automation-steps"] });
      toast.success("Automation updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update automation"),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete automation"),
  });
}

/**
 * Returns the count of `exit_criteria:*` events logged for an automation —
 * i.e. how many lead enrolments have been short-circuited by exit rules.
 */
export function useExitedCount(automationId: string | null) {
  return useQuery({
    queryKey: ["automation-exited-count", automationId],
    queryFn: async () => {
      if (!automationId) return 0;
      const { count, error } = await supabase
        .from("automation_logs")
        .select("id", { count: "exact", head: true })
        .eq("automation_id", automationId)
        .like("event_type", "exit_criteria:%");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!automationId,
  });
}

/**
 * Workspace-level: returns a map of automation_id -> exited count for ALL
 * automations in the workspace. Used to render the "Exited" column on the
 * Automations list without N+1 queries.
 */
export function useWorkspaceExitedCounts(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-exited-counts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_logs")
        .select("automation_id")
        .eq("workspace_id", workspaceId)
        .like("event_type", "exit_criteria:%");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { automation_id: string }[]) {
        map[row.automation_id] = (map[row.automation_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!workspaceId,
  });
}

/**
 * Bulk-applies the suggested default exit criteria to every active
 * nurture-style automation that currently has none. Idempotent.
 */
export function useBackfillExitDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { getDefaultExitCriteria } = await import("@/lib/automations/exitCriteria");
      const { data: autos, error } = await supabase
        .from("automations")
        .select("id, trigger_type, exit_criteria")
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      let updated = 0;
      for (const a of (autos ?? []) as Array<{ id: string; trigger_type: string; exit_criteria: unknown[] | null }>) {
        const current = (a.exit_criteria ?? []) as unknown[];
        if (current.length > 0) continue;
        const defaults = getDefaultExitCriteria(a.trigger_type);
        if (defaults.length === 0) continue;
        const { error: upErr } = await supabase
          .from("automations")
          .update({ exit_criteria: defaults as any })
          .eq("id", a.id);
        if (!upErr) updated++;
      }
      return updated;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      if (count > 0) {
        toast.success(`Applied default exit criteria to ${count} automation${count === 1 ? "" : "s"}`);
      } else {
        toast.info("No automations needed updating");
      }
    },
    onError: (e: any) => toast.error(e.message || "Backfill failed"),
  });
}

export function useSimulateAutomation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ automationId, workspaceId }: { automationId: string; workspaceId: string }) => {
      // Fetch steps
      const { data: steps } = await supabase
        .from("automation_steps")
        .select("*")
        .eq("automation_id", automationId)
        .order("step_order", { ascending: true });

      // Simulate executing each step and log
      for (const step of (steps ?? [])) {
        const s = step as AutomationStep;
        await supabase.from("automation_logs").insert({
          automation_id: automationId,
          workspace_id: workspaceId,
          event_type: `${s.step_type}:${(s.config as any)?.action || (s.config as any)?.condition || s.step_type}`,
          status: "success",
          details: { step_order: s.step_order, config: s.config, simulated: true },
        } as any);
      }

      // Update run count and last_run_at
      await supabase.from("automations").update({
        last_run_at: new Date().toISOString(),
        run_count: undefined, // we'll use raw SQL-like increment below
      } as any).eq("id", automationId);

      // Manually increment run_count
      const { data: current } = await supabase.from("automations").select("run_count").eq("id", automationId).single();
      if (current) {
        await supabase.from("automations").update({ run_count: (current.run_count as number) + 1 } as any).eq("id", automationId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["automation-logs"] });
      toast.success("Automation simulated successfully");
    },
    onError: (e: any) => toast.error(e.message || "Simulation failed"),
  });
}
