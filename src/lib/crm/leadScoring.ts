export type ScoringRules = Record<string, number>;

export type ScoringBands = { hot: number; warm: number };

export type ScoringDecay = { enabled: boolean; days: number; points: number };

export type LeadScoringConfig = {
  rules: ScoringRules;
  bands: ScoringBands;
  decay: ScoringDecay;
  custom_labels: Record<string, string>;
};

/** Built-in activity types recorded by funnels, emails, bookings and the tracker. */
export const BUILT_IN_ACTIVITIES: { key: string; label: string }[] = [
  { key: "form_submit", label: "Form submission" },
  { key: "email_open", label: "Email open" },
  { key: "link_click", label: "Link click" },
  { key: "lead_magnet_download", label: "Lead magnet download" },
  { key: "website_visit", label: "Website visit" },
  { key: "pricing_page_visit", label: "Pricing page visit" },
  { key: "webinar_registration", label: "Webinar registration" },
  { key: "call_booking", label: "Call booking" },
  { key: "email_unsubscribe", label: "Email unsubscribe" },
];

export const DEFAULT_RULES: ScoringRules = {
  form_submit: 10,
  email_open: 5,
  link_click: 10,
  lead_magnet_download: 20,
  website_visit: 5,
  pricing_page_visit: 25,
  webinar_registration: 30,
  call_booking: 50,
  email_unsubscribe: -50,
};

export const DEFAULT_BANDS: ScoringBands = { hot: 81, warm: 21 };
export const DEFAULT_DECAY: ScoringDecay = { enabled: true, days: 30, points: 20 };

export const DEFAULT_CONFIG: LeadScoringConfig = {
  rules: { ...DEFAULT_RULES },
  bands: { ...DEFAULT_BANDS },
  decay: { ...DEFAULT_DECAY },
  custom_labels: {},
};

export type ScoringPreset = {
  id: string;
  name: string;
  description: string;
  config: Pick<LeadScoringConfig, "rules" | "bands" | "decay">;
};

export const SCORING_PRESETS: ScoringPreset[] = [
  {
    id: "default",
    name: "Balanced (default)",
    description: "Even weighting across forms, emails and bookings.",
    config: { rules: { ...DEFAULT_RULES }, bands: { ...DEFAULT_BANDS }, decay: { ...DEFAULT_DECAY } },
  },
  {
    id: "coaching",
    name: "Coaching & consulting",
    description: "Call bookings and webinar signups weigh heaviest.",
    config: {
      rules: {
        form_submit: 10,
        email_open: 3,
        link_click: 8,
        lead_magnet_download: 20,
        website_visit: 3,
        pricing_page_visit: 20,
        webinar_registration: 40,
        call_booking: 60,
        email_unsubscribe: -60,
      },
      bands: { hot: 70, warm: 20 },
      decay: { enabled: true, days: 30, points: 15 },
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Product and pricing page activity weighs heaviest.",
    config: {
      rules: {
        form_submit: 8,
        email_open: 4,
        link_click: 12,
        lead_magnet_download: 10,
        website_visit: 10,
        pricing_page_visit: 35,
        webinar_registration: 5,
        call_booking: 20,
        email_unsubscribe: -50,
      },
      bands: { hot: 75, warm: 25 },
      decay: { enabled: true, days: 14, points: 20 },
    },
  },
  {
    id: "agency",
    name: "Agency / B2B services",
    description: "Forms, lead magnets and proposal engagement lead the score.",
    config: {
      rules: {
        form_submit: 20,
        email_open: 5,
        link_click: 12,
        lead_magnet_download: 30,
        website_visit: 5,
        pricing_page_visit: 30,
        webinar_registration: 20,
        call_booking: 50,
        email_unsubscribe: -50,
      },
      bands: { hot: 85, warm: 30 },
      decay: { enabled: true, days: 60, points: 20 },
    },
  },
  {
    id: "events",
    name: "Events & webinars",
    description: "Registration and attendance dominate the score.",
    config: {
      rules: {
        form_submit: 10,
        email_open: 5,
        link_click: 10,
        lead_magnet_download: 10,
        website_visit: 3,
        pricing_page_visit: 10,
        webinar_registration: 50,
        call_booking: 30,
        email_unsubscribe: -50,
      },
      bands: { hot: 70, warm: 20 },
      decay: { enabled: true, days: 30, points: 25 },
    },
  },
  {
    id: "local",
    name: "Local services",
    description: "Enquiry forms and call bookings dominate the score.",
    config: {
      rules: {
        form_submit: 30,
        email_open: 3,
        link_click: 5,
        lead_magnet_download: 5,
        website_visit: 5,
        pricing_page_visit: 20,
        webinar_registration: 0,
        call_booking: 60,
        email_unsubscribe: -50,
      },
      bands: { hot: 60, warm: 20 },
      decay: { enabled: true, days: 45, points: 15 },
    },
  },
];

export function activityLabel(key: string, customLabels: Record<string, string>): string {
  const builtIn = BUILT_IN_ACTIVITIES.find((a) => a.key === key);
  if (builtIn) return builtIn.label;
  return customLabels[key] || key.replace(/_/g, " ");
}

export function slugifyActivity(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function validateConfig(config: LeadScoringConfig): string | null {
  const { hot, warm } = config.bands;
  if (!Number.isFinite(hot) || !Number.isFinite(warm)) return "Band thresholds must be numbers.";
  if (warm < 1) return "The Warm threshold must be at least 1.";
  if (hot <= warm) return "The Hot threshold must be higher than the Warm threshold.";
  if (hot > 1000) return "The Hot threshold must be 1000 or less.";
  if (config.decay.enabled) {
    if (config.decay.days < 1) return "The decay window must be at least 1 day.";
    if (config.decay.points < 1) return "Decay must remove at least 1 point.";
  }
  for (const [key, value] of Object.entries(config.rules)) {
    if (!Number.isFinite(value)) return `Points for "${key}" must be a number.`;
    if (Math.abs(value) > 1000) return "Points must be between -1000 and 1000.";
  }
  return null;
}
