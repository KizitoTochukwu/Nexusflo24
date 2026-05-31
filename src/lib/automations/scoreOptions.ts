/**
 * Standardized lead scoring presets used across the Automations module
 * (action adjust_score). Each option maps a behaviour reason to a point delta.
 */
export const AUTOMATION_SCORE_OPTIONS = [
  { value: 5, reason: "new-lead", label: "+5 — New lead" },
  { value: 10, reason: "email-opened", label: "+10 — Email opened" },
  { value: 20, reason: "link-clicked", label: "+20 — Link clicked" },
  { value: 30, reason: "checkout-visited", label: "+30 — Checkout visited" },
  { value: 50, reason: "purchase", label: "+50 — Purchase" },
  { value: -20, reason: "cold-lead", label: "-20 — Cold lead" },
] as const;

export type AutomationScorePreset = (typeof AUTOMATION_SCORE_OPTIONS)[number];
