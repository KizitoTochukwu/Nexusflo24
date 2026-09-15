/**
 * Exit Criteria — declarative rules that stop a long-running automation early
 * when a lead's status changes (e.g. they purchased, unsubscribed, etc.).
 *
 * Stored on automations.exit_criteria as a JSONB array.
 */

import { supabase } from "@/integrations/supabase/client";
import { fireAutomationsForLeads } from "@/lib/automations/fireTriggers";

export type ExitCriterion =
  | { type: "purchase_happened" }
  | { type: "unsubscribed" }
  | { type: "appointment_booked" }
  | { type: "tag_added"; tag: string }
  | { type: "status_equals"; status: string }
  | { type: "deal_stage_reached"; pipeline?: string; from_position?: number }
  | { type: "consent_withdrawn" };

export const EXIT_CRITERION_TYPES: {
  value: ExitCriterion["type"];
  label: string;
  description: string;
  needsValue?: "tag" | "status";
}[] = [
  {
    value: "purchase_happened",
    label: "Lead purchases",
    description: "Stop sending if the lead completes a purchase.",
  },
  {
    value: "unsubscribed",
    label: "Lead unsubscribes",
    description: "Stop sending if the lead unsubscribes from emails.",
  },
  {
    value: "appointment_booked",
    label: "Lead books a meeting",
    description: "Stop sending if the lead books an appointment.",
  },
  {
    value: "tag_added",
    label: "Tag added",
    description: "Stop when a specific tag is added to the lead.",
    needsValue: "tag",
  },
  {
    value: "status_equals",
    label: "Lead reaches status",
    description: "Stop when the lead reaches a specific pipeline stage.",
    needsValue: "status",
  },
  {
    value: "deal_stage_reached",
    label: "Opportunity progresses or closes",
    description: "Stop when the opportunity moves past the early stages or is closed.",
  },
  {
    value: "consent_withdrawn",
    label: "Communication consent withdrawn",
    description: "Stop when the contact withdraws consent to be contacted.",
  },
];

/**
 * Trigger types that look like nurture-style sequences and benefit from
 * sensible default exit criteria. Users can remove these in the editor.
 */
const NURTURE_TRIGGER_TYPES = new Set([
  "new_lead",
  "lead_added_to_folder",
  "lead_tagged",
  "tag_added",
  "form_submitted",
  "campaign_completed",
]);

/**
 * Returns suggested default exit criteria for a given trigger type.
 * Returns [] if no defaults apply.
 */
export function getDefaultExitCriteria(triggerType: string): ExitCriterion[] {
  if (!NURTURE_TRIGGER_TYPES.has(triggerType)) return [];
  return [
    { type: "purchase_happened" },
    { type: "unsubscribed" },
  ];
}

/**
 * Maps the firing event_type from fireAutomationsForLeads to the exit criteria
 * it should match. Returns true if the criterion is satisfied by this event.
 */
export function eventMatchesCriterion(
  criterion: ExitCriterion,
  event: { type: string; tag?: string; status?: string }
): boolean {
  switch (criterion.type) {
    case "purchase_happened":
      return event.type === "purchase_event" || event.type === "purchase_happened";
    case "unsubscribed":
      return event.type === "unsubscribed" || event.type === "email_unsubscribe";
    case "appointment_booked":
      return event.type === "book_appointment" || event.type === "appointment_booked";
    case "tag_added":
      return (
        (event.type === "tag_added" || event.type === "lead_tagged") &&
        !!criterion.tag &&
        !!event.tag &&
        criterion.tag.toLowerCase() === event.tag.toLowerCase()
      );
    case "status_equals":
      return (
        event.type === "status_changed" &&
        !!criterion.status &&
        !!event.status &&
        criterion.status === event.status
      );
    default:
      return false;
  }
}

export function describeCriterion(c: ExitCriterion): string {
  switch (c.type) {
    case "purchase_happened":
      return "Lead purchases";
    case "unsubscribed":
      return "Lead unsubscribes";
    case "appointment_booked":
      return "Lead books a meeting";
    case "tag_added":
      return `Tag "${c.tag}" added`;
    case "status_equals":
      return `Status becomes "${c.status}"`;
    case "deal_stage_reached":
      return "Opportunity progresses or closes";
    case "consent_withdrawn":
      return "Communication consent withdrawn";
  }
}

/**
 * Simulates an exit event for a specific lead, using the same cancellation
 * code path the live triggers use. Returns the number of pending jobs that
 * were cancelled across all matching automations.
 *
 * For the test we ALSO write a matching activity / tag / status update so
 * the on-resume re-check in execute-automation will catch race conditions.
 */
export async function simulateExitEvent(params: {
  workspaceId: string;
  leadId: string;
  criterion: ExitCriterion;
}): Promise<{ cancelledCount: number; eventType: string }> {
  const { workspaceId, leadId, criterion } = params;

  // 1) Persist the underlying state change so the on-resume re-check works too.
  if (criterion.type === "purchase_happened") {
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      workspace_id: workspaceId,
      user_id: "00000000-0000-0000-0000-000000000000",
      type: "purchase",
      meta: { source: "exit_criteria_test" },
    } as any);
  } else if (criterion.type === "unsubscribed") {
    const { data: lead } = await supabase
      .from("leads")
      .select("tags")
      .eq("id", leadId)
      .maybeSingle();
    const tags = (lead?.tags ?? []) as string[];
    if (!tags.includes("unsubscribed")) {
      await supabase
        .from("leads")
        .update({ tags: [...tags, "unsubscribed"] })
        .eq("id", leadId);
    }
  } else if (criterion.type === "tag_added" && criterion.tag) {
    const { data: lead } = await supabase
      .from("leads")
      .select("tags")
      .eq("id", leadId)
      .maybeSingle();
    const tags = (lead?.tags ?? []) as string[];
    if (!tags.includes(criterion.tag)) {
      await supabase
        .from("leads")
        .update({ tags: [...tags, criterion.tag] })
        .eq("id", leadId);
    }
  } else if (criterion.type === "status_equals" && criterion.status) {
    await supabase
      .from("leads")
      .update({ status: criterion.status })
      .eq("id", leadId);
  }

  // 2) Snapshot pending job count before the sweep.
  const { count: beforeCount } = await supabase
    .from("scheduled_jobs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "pending");

  // 3) Fire the same trigger dispatcher live events use. This will run the
  //    exit-criteria sweep for ALL active automations in the workspace.
  const eventType =
    criterion.type === "purchase_happened"
      ? "purchase_event"
      : criterion.type === "unsubscribed"
      ? "unsubscribed"
      : criterion.type === "appointment_booked"
      ? "book_appointment"
      : criterion.type === "tag_added"
      ? "tag_added"
      : "status_changed";

  const triggerConfigMatch: Record<string, string> = {};
  if (criterion.type === "tag_added") triggerConfigMatch.tag = criterion.tag;
  if (criterion.type === "status_equals") triggerConfigMatch.status = criterion.status;

  await fireAutomationsForLeads({
    workspaceId,
    leadIds: [leadId],
    triggerType: eventType,
    triggerConfigMatch: Object.keys(triggerConfigMatch).length ? triggerConfigMatch : undefined,
  });

  // 4) Re-snapshot to compute how many jobs were cancelled.
  const { count: afterCount } = await supabase
    .from("scheduled_jobs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "pending");

  const cancelledCount = Math.max(0, (beforeCount ?? 0) - (afterCount ?? 0));
  return { cancelledCount, eventType };
}
