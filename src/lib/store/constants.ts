export type StoreLevel = "quick" | "business" | "system";

export const LEVELS: Record<StoreLevel, { label: string; badge: string; range: string; blurb: string }> = {
  quick: {
    label: "Quick Automation",
    badge: "Quick Win",
    range: "£99 – £299",
    blurb: "A single-purpose workflow that removes one repetitive task.",
  },
  business: {
    label: "Business Automation",
    badge: "Business Automation",
    range: "£300 – £750",
    blurb: "Multi-step workflows connecting several of your business systems.",
  },
  system: {
    label: "Automation System",
    badge: "Advanced System",
    range: "£750 – £3,000+",
    blurb: "Connected systems covering multiple business processes end to end.",
  },
};

export const LEVEL_ORDER: StoreLevel[] = ["quick", "business", "system"];

export const DELIVERY_BUCKETS = [
  { value: "fast", label: "Up to 5 working days", max: 5 },
  { value: "standard", label: "6 – 10 working days", max: 10 },
  { value: "complex", label: "More than 10 working days", max: 999 },
] as const;

export const PRICE_BANDS = [
  { value: "under-250", label: "Under £250", min: 0, max: 24999 },
  { value: "250-500", label: "£250 – £500", min: 25000, max: 50000 },
  { value: "500-1000", label: "£500 – £1,000", min: 50000, max: 100000 },
  { value: "1000-plus", label: "£1,000+", min: 100000, max: Number.MAX_SAFE_INTEGER },
] as const;

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
] as const;

export const DELIVERY_STEPS = [
  { title: "Configure", body: "Tell us how your business currently works." },
  { title: "Purchase", body: "Pay securely online." },
  { title: "Onboard", body: "Provide the required business information and access." },
  { title: "Build", body: "NexusFlo24 configures the automation." },
  { title: "Test", body: "We test the complete workflow." },
  { title: "Approve", body: "You review and approve the system." },
  { title: "Go Live", body: "Your automation is activated." },
];

export const TRUST_POINTS = [
  { icon: "Handshake", label: "Done For You" },
  { icon: "ShieldCheck", label: "Secure Setup" },
  { icon: "FlaskConical", label: "Built & Tested" },
  { icon: "Headphones", label: "Human Support" },
  { icon: "Feather", label: "No Technical Skills Required" },
];

/** Fallback configurator questions used when a product has no bespoke schema. */
export const DEFAULT_CONFIG_SCHEMA = [
  {
    id: "lead_sources",
    label: "Where do your leads currently come from?",
    type: "multi",
    options: ["Website", "Facebook", "Instagram", "LinkedIn", "Google Ads", "WhatsApp", "Landing page", "Other"],
  },
  {
    id: "crm",
    label: "Which CRM do you use?",
    type: "single",
    options: ["HubSpot", "Zoho", "Salesforce", "GoHighLevel", "Airtable", "Google Sheets", "None", "Other"],
  },
  {
    id: "channels",
    label: "Which communication channels do you want?",
    type: "multi",
    options: ["Email", "SMS", "WhatsApp", "Internal notification"],
    pricePerExtra: 5000,
    included: 1,
  },
  {
    id: "systems",
    label: "How many systems need connecting?",
    type: "single",
    options: ["1 – 2", "3 – 4", "5 or more"],
    priceBy: { "3 – 4": 7500, "5 or more": 15000 },
  },
  {
    id: "volume",
    label: "Approximately how many leads or customers do you process monthly?",
    type: "single",
    options: ["Under 100", "100 – 500", "500 – 2,000", "2,000+"],
    priceBy: { "500 – 2,000": 5000, "2,000+": 12500 },
  },
  {
    id: "accounts_ready",
    label: "Do you already have the necessary software accounts?",
    type: "single",
    options: ["Yes", "No", "Not sure"],
    priceBy: { No: 7500 },
  },
];

export const INDUSTRIES = [
  "Professional Services",
  "Marketing",
  "Property",
  "Recruitment",
  "Health",
  "Coaching",
  "Retail",
  "Hospitality",
  "Construction",
  "Beauty",
];

export const INTEGRATIONS = [
  "HubSpot", "Zoho", "Salesforce", "GoHighLevel", "LinkedIn", "Meta", "Google Ads", "WhatsApp",
  "Gmail", "Outlook", "Mailchimp", "ActiveCampaign", "Stripe", "Shopify", "WooCommerce",
  "Calendly", "Google Calendar", "Google Sheets", "Airtable", "Xero", "Website",
];
