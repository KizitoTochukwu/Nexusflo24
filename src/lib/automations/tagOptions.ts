/**
 * Standardized tag taxonomy used across the Automations module
 * (action add_tag/remove_tag, trigger lead_tagged, exit criterion tag_added).
 */
export const AUTOMATION_TAG_OPTIONS = [
  "new-lead",
  "engaged",
  "cold-lead",
  "high-intent",
  "qualified",
  "customer",
  "re-engagement",
  "monthly-newsletter",
] as const;

export type AutomationTag = (typeof AUTOMATION_TAG_OPTIONS)[number];

