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

/** Public booking page used for the pre-sale "automation fit" call. */
export const FIT_CALL_PATH = "/book/book-a-free-15-minute-automation-fit-call-9c004f";

/** Trust points shown on every automation product page. */
export const PRODUCT_TRUST_POINTS = [
  { icon: "FileCheck", title: "Fixed scope confirmed before payment", body: "You see exactly what is included, in writing, before anything is charged." },
  { icon: "ShieldCheck", title: "Secure onboarding", body: "Access is requested through secure invitations. We never ask for your passwords." },
  { icon: "Users", title: "Human implementation", body: "A real specialist configures your automation — not a template dropped into your account." },
  { icon: "FlaskConical", title: "Complete workflow testing", body: "Every step is tested end to end before it touches a live customer." },
  { icon: "LifeBuoy", title: "Go-live support", body: "We stay with you through launch and watch the first runs together." },
  { icon: "CalendarClock", title: "Clear delivery timeline", body: "You get a delivery window at onboarding and progress updates at every stage." },
];

/** Standard exclusions listed on every automation. */
export const NOT_INCLUDED_ITEMS = [
  "Third-party software subscriptions and usage fees",
  "Advertising spend",
  "WhatsApp / Meta approval or messaging fees",
  "Custom software development outside the agreed scope",
  "Extra integrations or revisions outside the selected configuration",
];

export const NOT_INCLUDED_NOTE =
  "Anything beyond the agreed scope is quoted and approved by you in writing before any work begins. There are no surprise charges.";

/** Standard purchase assurance points. */
export const ORDER_ASSURANCE = [
  "Fixed scope confirmed before payment",
  "Secure checkout",
  "3–5 working day delivery where stated",
  "You approve before go-live",
  "We never ask for your passwords",
];

/** Standard FAQ shown on every automation detail page. */
export const PRODUCT_FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need a NexusFlo24 subscription?",
    a: "No. Automations can be delivered into the tools you already use. A NexusFlo24 subscription is only required if the automation runs inside NexusFlo24 itself — we confirm this with you before payment.",
  },
  {
    q: "Do I need existing software accounts?",
    a: "You need accounts for any third-party tools the automation connects to. If you do not have them yet, we tell you which are needed during configuration and help you set them up as part of onboarding.",
  },
  {
    q: "Are third-party fees included?",
    a: "No. Subscriptions, usage fees, messaging fees and advertising spend on third-party platforms are billed by those providers directly and are not part of the setup price.",
  },
  {
    q: "Will NexusFlo24 need my password?",
    a: "Never. We request access through the secure invitation or API-key process each platform provides, and access can be revoked by you at any time.",
  },
  {
    q: "What happens after purchase?",
    a: "You receive a confirmation email and an onboarding form. Once your details are in, we build the automation, test the full workflow, ask for your approval, and then take it live.",
  },
  {
    q: "Can I request changes to the scope?",
    a: "Yes. Tell us what you need and we quote it before starting. No additional work is carried out until you approve it.",
  },
  {
    q: "Is ongoing support available?",
    a: "Yes. Automation Care plans add monitoring, adjustments and priority support. They are optional and priced separately from the one-time setup.",
  },
  {
    q: "Can I cancel an Automation Care plan?",
    a: "Yes. Care plans are monthly and can be cancelled at any time. Your automation keeps running — you simply stop receiving the managed support.",
  },
];
