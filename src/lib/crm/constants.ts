export const LIFECYCLE_STAGES = [
  { value: "subscriber", label: "Subscriber", color: "bg-slate-100 text-slate-700" },
  { value: "lead", label: "Lead", color: "bg-blue-100 text-blue-700" },
  { value: "marketing_qualified_lead", label: "Marketing Qualified", color: "bg-indigo-100 text-indigo-700" },
  { value: "sales_qualified_lead", label: "Sales Qualified", color: "bg-amber-100 text-amber-800" },
  { value: "opportunity", label: "Opportunity", color: "bg-orange-100 text-orange-700" },
  { value: "customer", label: "Customer", color: "bg-emerald-100 text-emerald-800" },
  { value: "evangelist", label: "Evangelist", color: "bg-purple-100 text-purple-700" },
  { value: "other", label: "Other", color: "bg-muted text-muted-foreground" },
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number]["value"];

export const CONSENT_STATUSES = [
  { value: "unknown", label: "Unknown", color: "bg-muted text-muted-foreground" },
  { value: "opted_in", label: "Opted in", color: "bg-emerald-100 text-emerald-800" },
  { value: "opted_out", label: "Opted out", color: "bg-red-100 text-red-700" },
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-800" },
] as const;

export type ConsentStatus = typeof CONSENT_STATUSES[number]["value"];

export const SCORE_BANDS = [
  { min: 80, label: "Sales Ready", color: "bg-emerald-100 text-emerald-800" },
  { min: 60, label: "Hot", color: "bg-orange-100 text-orange-700" },
  { min: 30, label: "Warm", color: "bg-amber-100 text-amber-800" },
  { min: 0, label: "Cold", color: "bg-slate-100 text-slate-700" },
] as const;

export function scoreBand(score: number) {
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

export function lifecycleMeta(value?: string | null) {
  return LIFECYCLE_STAGES.find((s) => s.value === value) ?? LIFECYCLE_STAGES[1];
}

export function consentMeta(value?: string | null) {
  return CONSENT_STATUSES.find((s) => s.value === value) ?? CONSENT_STATUSES[0];
}

export type ContactColumnKey =
  | "full_name"
  | "email"
  | "phone"
  | "company_name"
  | "job_title"
  | "lifecycle_stage"
  | "score"
  | "owner_user_id"
  | "source"
  | "consent_status"
  | "tags"
  | "created_at"
  | "last_activity_at";

export const CONTACT_COLUMNS: { key: ContactColumnKey; label: string; sortable?: boolean; alwaysOn?: boolean }[] = [
  { key: "full_name", label: "Name", sortable: true, alwaysOn: true },
  { key: "email", label: "Email", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "company_name", label: "Company", sortable: true },
  { key: "job_title", label: "Job title" },
  { key: "lifecycle_stage", label: "Lifecycle stage", sortable: true },
  { key: "score", label: "Score", sortable: true },
  { key: "owner_user_id", label: "Owner" },
  { key: "source", label: "Source", sortable: true },
  { key: "consent_status", label: "Consent" },
  { key: "tags", label: "Tags" },
  { key: "created_at", label: "Created", sortable: true },
  { key: "last_activity_at", label: "Last activity", sortable: true },
];

export const DEFAULT_CONTACT_COLUMNS: ContactColumnKey[] = [
  "full_name",
  "email",
  "phone",
  "company_name",
  "lifecycle_stage",
  "score",
  "owner_user_id",
  "created_at",
];

export const CONTACT_PAGE_SIZE = 25;

/** Activity types used across the unified CRM timeline. */
export const ACTIVITY_TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Record", types: ["contact_created", "contact_updated", "owner_changed", "stage_changed", "tag_changed", "consent_changed", "score_changed", "archived", "restored"] },
  { label: "Communication", types: ["email_sent", "email_delivered", "email_opened", "email_clicked", "email_bounced", "email_replied", "whatsapp_sent", "whatsapp_delivered", "whatsapp_read", "sms_sent", "sms_delivered", "call_logged"] },
  { label: "Engagement", types: ["form_submission", "campaign_engagement", "meeting_booked", "meeting_completed"] },
  { label: "Work", types: ["task_created", "task_completed", "note_added", "file_uploaded", "deal_stage_changed"] },
  { label: "Automation & AI", types: ["automation_enrolled", "automation_completed", "ai_recommendation", "ai_action_confirmed"] },
];

export const ALL_ACTIVITY_TYPES = ACTIVITY_TYPE_GROUPS.flatMap((g) => g.types);

export function activityLabel(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Company reference data (CRM Phase 2). */
export const COMPANY_SIZE_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

export const INDUSTRIES = [
  "Agency & Consulting",
  "E-commerce & Retail",
  "Education & Training",
  "Financial Services",
  "Health & Wellness",
  "Hospitality & Travel",
  "Manufacturing",
  "Media & Entertainment",
  "Non-profit",
  "Professional Services",
  "Property & Construction",
  "SaaS & Technology",
  "Other",
] as const;

export type CompanyColumnKey =
  | "name" | "domain" | "industry" | "size_band" | "lifecycle_stage"
  | "city" | "country" | "owner_user_id" | "created_at" | "last_activity_at";

export const COMPANY_COLUMNS: { key: CompanyColumnKey; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Company", sortable: true },
  { key: "domain", label: "Domain", sortable: true },
  { key: "industry", label: "Industry", sortable: true },
  { key: "size_band", label: "Size" },
  { key: "lifecycle_stage", label: "Stage", sortable: true },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "owner_user_id", label: "Owner" },
  { key: "created_at", label: "Created", sortable: true },
];
