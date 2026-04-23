/**
 * Exit Criteria — declarative rules that stop a long-running automation early
 * when a lead's status changes (e.g. they purchased, unsubscribed, etc.).
 *
 * Stored on automations.exit_criteria as a JSONB array.
 */

export type ExitCriterion =
  | { type: "purchase_happened" }
  | { type: "unsubscribed" }
  | { type: "appointment_booked" }
  | { type: "tag_added"; tag: string }
  | { type: "status_equals"; status: string };

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
  }
}
