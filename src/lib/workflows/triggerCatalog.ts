// Catalog of enrollment trigger sources + events.
// Machine keys are stored in workflows.trigger_event; friendly labels are
// rendered in UI. Adding a source here automatically surfaces it in the
// enrollment trigger drawer.

export type EnrollmentObject =
  | "contact" | "lead" | "deal" | "booking" | "conversation" | "payment" | "subscription";

export type EnrollmentMethod = "event" | "filter" | "schedule" | "webhook" | "manual";

export type TriggerSourceKey =
  | "crm" | "forms" | "funnels" | "meta_lead_ads" | "linkedin_lead_gen"
  | "google_lead_forms" | "bookings" | "email" | "whatsapp" | "sms"
  | "payments" | "commerce" | "campaigns" | "webhooks";

export type ScopeFieldKey =
  // CRM
  | "pipeline" | "stage" | "owner" | "lead_source" | "tags"
  // Forms
  | "form_id"
  // Funnels
  | "funnel_id" | "funnel_page_id" | "funnel_form_id" | "funnel_step_id"
  // Bookings
  | "calendar_id" | "booking_type" | "assigned_user" | "appointment_status"
  // Meta
  | "meta_connection_id" | "meta_ad_account_id" | "meta_page_id"
  | "meta_form_id" | "meta_campaign_id" | "meta_adset_id" | "meta_ad_id"
  // Campaigns
  | "campaign_id"
  // Commerce
  | "store_id" | "shop_product_id"
  // Webhook
  | "webhook_path";

export interface ScopeField {
  key: ScopeFieldKey;
  label: string;
  required?: boolean;
  allowAny?: boolean; // shows "Any value"
}

export interface TriggerEventDef {
  key: string;                // stored machine key
  label: string;              // friendly label
  description?: string;
  scopeFields?: ScopeField[]; // override source-level fields when event-specific
  defaultDedupKey?: string;   // e.g. meta.leadgen_id
  /**
   * False when nothing in the platform fires this event yet. Such events are
   * shown as "Coming soon" and cannot be selected, so a trigger can never be
   * saved in a state that silently never runs.
   */
  emitted?: boolean;
}

export interface TriggerSourceDef {
  key: TriggerSourceKey;
  label: string;
  description: string;
  objects: EnrollmentObject[];   // which enrollment objects this source can drive
  scopeFields: ScopeField[];
  events: TriggerEventDef[];
}

export const ENROLLMENT_OBJECTS: {
  key: EnrollmentObject; label: string; description: string; supported?: boolean;
}[] = [
  { key: "contact", label: "Contact", description: "Any person record", supported: true },
  { key: "lead", label: "Lead", description: "Prospect in the CRM", supported: true },
  { key: "deal", label: "Deal", description: "Pipeline opportunity", supported: false },
  { key: "booking", label: "Booking", description: "Calendar appointment", supported: false },
  { key: "conversation", label: "Conversation", description: "Inbox thread", supported: false },
  { key: "payment", label: "Payment", description: "One-off transaction", supported: false },
  { key: "subscription", label: "Subscription", description: "Recurring plan", supported: false },
];

export const ENROLLMENT_METHODS: {
  key: EnrollmentMethod; label: string; description: string; supported?: boolean;
}[] = [
  { key: "event", label: "When an event occurs", description: "Enrol as soon as a matching event fires", supported: true },
  { key: "manual", label: "Manual enrollment", description: "Only enrol records you add by hand", supported: true },
  { key: "filter", label: "When filter criteria are met", description: "Enrol when a record starts matching a saved filter", supported: false },
  { key: "schedule", label: "On a schedule", description: "Run at a fixed interval", supported: false },
  { key: "webhook", label: "When a webhook is received", description: "Enrol from an inbound webhook call", supported: false },
];

export function isObjectSupported(key?: string | null): boolean {
  return ENROLLMENT_OBJECTS.find((o) => o.key === key)?.supported === true;
}

export function isMethodSupported(key?: string | null): boolean {
  return ENROLLMENT_METHODS.find((m) => m.key === key)?.supported === true;
}

const CRM_SCOPE: ScopeField[] = [
  { key: "pipeline", label: "Pipeline", allowAny: true },
  { key: "stage", label: "Stage", allowAny: true },
  { key: "owner", label: "Owner", allowAny: true },
  { key: "lead_source", label: "Lead source", allowAny: true },
  { key: "tags", label: "Tags", allowAny: true },
];

const META_SCOPE: ScopeField[] = [
  { key: "meta_connection_id", label: "Meta connection", required: true },
  { key: "meta_ad_account_id", label: "Ad account", allowAny: true },
  { key: "meta_page_id", label: "Facebook Page", required: true },
  { key: "meta_form_id", label: "Lead form", required: true },
  { key: "meta_campaign_id", label: "Campaign", allowAny: true },
  { key: "meta_adset_id", label: "Ad set", allowAny: true },
  { key: "meta_ad_id", label: "Ad", allowAny: true },
];

export const TRIGGER_SOURCES: TriggerSourceDef[] = [
  {
    key: "crm", label: "CRM", description: "Lead, contact and deal changes inside NexusFlo24",
    objects: ["contact", "lead", "deal"],
    scopeFields: CRM_SCOPE,
    events: [
      { key: "new_lead", label: "New lead created", emitted: true },
      { key: "lead_added_to_folder", label: "Lead added to folder", emitted: true },
      { key: "lead_tagged", label: "Lead tagged", emitted: true },
      { key: "tag_added", label: "Any tag added", description: "Fires for every newly applied tag", emitted: true },
      { key: "contact_created", label: "Contact created", emitted: true },
      { key: "contact_updated", label: "Contact updated", emitted: true },
      { key: "score_threshold", label: "Lead score threshold reached", emitted: false },
    ],
  },
  {
    key: "forms", label: "Website forms", description: "Embedded and hosted NexusFlo24 forms",
    objects: ["lead", "contact"],
    scopeFields: [{ key: "form_id", label: "Form", allowAny: true }],
    events: [
      { key: "form_submitted", label: "Form submitted", emitted: true },
      { key: "roi_calculator_submitted", label: "ROI calculator submitted", emitted: true },
    ],
  },
  {
    key: "funnels", label: "Funnels", description: "Landing pages and multi-step funnels",
    objects: ["lead", "contact"],
    scopeFields: [
      { key: "funnel_id", label: "Funnel", allowAny: true },
      { key: "funnel_page_id", label: "Page", allowAny: true },
      { key: "funnel_form_id", label: "Form", allowAny: true },
      { key: "funnel_step_id", label: "Funnel step", allowAny: true },
    ],
    events: [
      { key: "form_submitted", label: "Funnel form submitted", emitted: true },
      { key: "funnel_step_completed", label: "Funnel step completed", emitted: false },
    ],
  },
  {
    key: "meta_lead_ads", label: "Meta Lead Ads", description: "Facebook & Instagram Lead Ads",
    objects: ["lead", "contact"],
    scopeFields: META_SCOPE,
    events: [
      { key: "meta_lead_received", label: "New Facebook lead received", defaultDedupKey: "meta.leadgen_id", emitted: false },
      { key: "meta_lead_updated", label: "Facebook lead updated", defaultDedupKey: "meta.leadgen_id", emitted: false },
    ],
  },
  {
    key: "linkedin_lead_gen", label: "LinkedIn Lead Gen", description: "LinkedIn Lead Gen Forms",
    objects: ["lead", "contact"],
    scopeFields: [{ key: "meta_form_id", label: "Lead form", allowAny: true }],
    events: [{ key: "linkedin_lead_received", label: "New LinkedIn lead received", emitted: false }],
  },
  {
    key: "google_lead_forms", label: "Google Lead Forms", description: "Google Ads Lead Form extensions",
    objects: ["lead", "contact"],
    scopeFields: [{ key: "meta_form_id", label: "Lead form", allowAny: true }],
    events: [{ key: "google_lead_received", label: "New Google lead received", emitted: false }],
  },
  {
    key: "bookings", label: "Bookings", description: "Calendar appointments",
    objects: ["booking", "lead", "contact"],
    scopeFields: [
      { key: "calendar_id", label: "Calendar", allowAny: true },
      { key: "booking_type", label: "Booking type", allowAny: true },
      { key: "assigned_user", label: "Assigned user", allowAny: true },
      { key: "appointment_status", label: "Appointment status", allowAny: true },
    ],
    events: [
      { key: "book_appointment", label: "Appointment booked", emitted: true },
      { key: "appointment_cancelled", label: "Appointment cancelled", emitted: false },
      { key: "appointment_completed", label: "Appointment completed", emitted: false },
    ],
  },
  {
    key: "email", label: "Email", description: "Email engagement events",
    objects: ["lead", "contact"],
    scopeFields: [],
    events: [
      { key: "email_opened", label: "Email opened", emitted: false },
      { key: "email_not_opened", label: "Email not opened after delay", emitted: false },
      { key: "link_clicked", label: "Link clicked", emitted: false },
    ],
  },
  {
    key: "whatsapp", label: "WhatsApp", description: "WhatsApp conversation events",
    objects: ["conversation", "lead", "contact"],
    scopeFields: [],
    events: [{ key: "whatsapp_replied", label: "WhatsApp reply received", emitted: false }],
  },
  {
    key: "sms", label: "SMS", description: "SMS conversation events",
    objects: ["conversation", "lead", "contact"],
    scopeFields: [],
    events: [{ key: "sms_replied", label: "SMS reply received", emitted: false }],
  },
  {
    key: "payments", label: "Payments", description: "Stripe / Paystack transactions",
    objects: ["payment", "contact"],
    scopeFields: [],
    events: [{ key: "order_paid", label: "Purchase completed", emitted: true }],
  },
  {
    key: "commerce", label: "Commerce store", description: "Your storefront orders, subscriptions and refunds",
    objects: ["payment", "subscription", "contact", "lead"],
    scopeFields: [
      { key: "store_id", label: "Store", allowAny: true },
      { key: "shop_product_id", label: "Product", allowAny: true },
    ],
    events: [
      { key: "order_paid", label: "Order paid", description: "Any successful storefront purchase", defaultDedupKey: "order_id", emitted: true },
      { key: "first_order_placed", label: "First order placed", description: "Buyer's very first paid order", emitted: true },
      { key: "order_refunded", label: "Order refunded", emitted: true },
      { key: "checkout_started", label: "Checkout started", description: "Buyer began checkout", emitted: true },
      { key: "checkout_abandoned", label: "Checkout abandoned", description: "Checkout session expired without payment", emitted: false },
      { key: "payment_failed", label: "Payment failed", emitted: false },
      { key: "subscription_started", label: "Subscription started", emitted: true },
      { key: "subscription_renewed", label: "Subscription renewed", emitted: true },
      { key: "subscription_cancelled", label: "Subscription cancelled", emitted: true },
    ],
  },
  {
    key: "campaigns", label: "Campaigns", description: "Broadcasts and drips",
    objects: ["lead", "contact"],
    scopeFields: [{ key: "campaign_id", label: "Campaign", allowAny: true }],
    events: [{ key: "campaign_completed", label: "Campaign completed", emitted: false }],
  },
  {
    key: "webhooks", label: "Webhooks", description: "Inbound webhooks from external systems",
    objects: ["contact", "lead", "deal", "payment"],
    scopeFields: [{ key: "webhook_path", label: "Webhook path" }],
    events: [{ key: "webhook_received", label: "Webhook received" }],
  },
];

export const OPERATORS: { key: string; label: string; noValue?: boolean }[] = [
  { key: "eq", label: "is equal to" },
  { key: "neq", label: "is not equal to" },
  { key: "in", label: "is any of" },
  { key: "nin", label: "is none of" },
  { key: "contains", label: "contains" },
  { key: "ncontains", label: "does not contain" },
  { key: "known", label: "is known", noValue: true },
  { key: "unknown", label: "is unknown", noValue: true },
  { key: "gt", label: "is greater than" },
  { key: "lt", label: "is less than" },
  { key: "before", label: "is before" },
  { key: "after", label: "is after" },
];

export const REENROLLMENT_MODES: { key: string; label: string; description: string }[] = [
  { key: "never", label: "Do not allow re-enrollment", description: "Each record can enter this workflow only once" },
  { key: "every_event", label: "Re-enroll every time the event occurs", description: "Every matching event starts a fresh run" },
  { key: "conditions_true_again", label: "Re-enroll when conditions become true again", description: "Runs again the next time the record newly matches" },
  { key: "after_wait", label: "Re-enroll after a waiting period", description: "Runs again once the wait has elapsed" },
];

// ------- helpers -------
export function findSource(key?: string | null): TriggerSourceDef | undefined {
  if (!key) return undefined;
  return TRIGGER_SOURCES.find((s) => s.key === key);
}

export function findEvent(sourceKey?: string | null, eventKey?: string | null): TriggerEventDef | undefined {
  const src = findSource(sourceKey);
  if (!src) return undefined;
  return src.events.find((e) => e.key === eventKey);
}

export function friendlyTriggerLabel(sourceKey?: string | null, eventKey?: string | null): string {
  const ev = findEvent(sourceKey, eventKey);
  if (ev) return ev.label;
  const src = findSource(sourceKey);
  if (src) return src.label;
  return "No trigger configured";
}

export function scopeFieldsFor(sourceKey?: string | null, eventKey?: string | null): ScopeField[] {
  const ev = findEvent(sourceKey, eventKey);
  if (ev?.scopeFields) return ev.scopeFields;
  const src = findSource(sourceKey);
  return src?.scopeFields ?? [];
}

export interface TriggerLike {
  enrollment_object_type?: string | null;
  trigger_source?: string | null;
  trigger_event?: string | null;
  trigger_config?: Record<string, any> | null;
}

/** Green = configured, amber = incomplete, red = error. */
export function configurationStatus(w: TriggerLike): "configured" | "incomplete" | "error" {
  if (!w.trigger_source || !w.trigger_event) return "incomplete";
  const fields = scopeFieldsFor(w.trigger_source, w.trigger_event);
  const cfg = w.trigger_config || {};
  const missingRequired = fields.filter((f) => f.required && !cfg[f.key]);
  if (missingRequired.length > 0) return "incomplete";
  return "configured";
}

export function buildTriggerSummary(w: TriggerLike & { name?: string }): string {
  const src = findSource(w.trigger_source);
  const ev = findEvent(w.trigger_source, w.trigger_event);
  if (!src || !ev) return "Trigger not configured yet.";
  const cfg = w.trigger_config || {};

  const namedParts: string[] = [];
  const scopedFields = scopeFieldsFor(w.trigger_source, w.trigger_event);
  for (const f of scopedFields) {
    const v = cfg[f.key];
    if (v && typeof v === "object" && "label" in v && v.label) {
      namedParts.push(`${f.label.toLowerCase()} ${v.label}`);
    } else if (typeof v === "string" && v && v !== "__any__") {
      namedParts.push(`${f.label.toLowerCase()} ${v}`);
    }
  }
  const obj = w.enrollment_object_type || "record";
  const scope = namedParts.length ? ` from ${namedParts.slice(0, 3).join(" and ")}` : "";
  return `Enrol ${obj}s when ${ev.label.toLowerCase()}${scope}.`;
}

export function scopeSummary(w: TriggerLike): string {
  const fields = scopeFieldsFor(w.trigger_source, w.trigger_event);
  const cfg = w.trigger_config || {};
  const parts: string[] = [];
  for (const f of fields.slice(0, 3)) {
    const v = cfg[f.key];
    if (!v) continue;
    if (typeof v === "object" && v?.label) parts.push(`${f.label}: ${v.label}`);
    else if (typeof v === "string" && v !== "__any__") parts.push(`${f.label}: ${v}`);
  }
  return parts.join(" · ");
}
