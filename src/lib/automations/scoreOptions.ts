/**
 * Standardized lead scoring presets used across the Automations module
 * (action adjust_score). Each option maps a behaviour reason to a point delta.
 */
export const AUTOMATION_SCORE_OPTIONS = [
  { value: -20, reason: "adjust-minus-20", label: "-20" },
  { value: -10, reason: "adjust-minus-10", label: "-10" },
  { value: 5, reason: "adjust-plus-5", label: "+5" },
  { value: 10, reason: "adjust-plus-10", label: "+10" },
  { value: 15, reason: "adjust-plus-15", label: "+15" },
  { value: 20, reason: "adjust-plus-20", label: "+20" },
  { value: 30, reason: "adjust-plus-30", label: "+30" },
  { value: 40, reason: "adjust-plus-40", label: "+40" },
  { value: 50, reason: "adjust-plus-50", label: "+50" },
] as const;

export type AutomationScorePreset = (typeof AUTOMATION_SCORE_OPTIONS)[number];
