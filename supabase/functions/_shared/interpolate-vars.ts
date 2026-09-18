// Shared variable interpolation for outbound messages (email/SMS/WhatsApp).
// Single source of truth for all {{token}} replacements across:
//   - execute-campaign
//   - execute-automation
//   - execute-workflow
//   - email-send / sms-send / whatsapp-send (defense-in-depth final pass)
//
// Token names match those advertised in src/components/automations/email-editor/editorConstants.ts
// and src/components/funnels/builder/funnelEditorConstants.ts.

export type LeadLike = {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status?: string | null;
  score?: number | null;
  tags?: string[] | null;
  assigned_owner_id?: string | null;
  last_activity_at?: string | null;
  updated_at?: string | null;
} & Record<string, any>;

export type WorkspaceLinks = {
  booking_link?: string;
  funnel_link?: string;
  offer_page_link?: string;
  webinar_link?: string;
  checkout_link?: string;
  next_step_link?: string;
  external_url?: string;
  unsubscribe_link?: string;
};

export type BuildVarsOptions = {
  links?: WorkspaceLinks;
  assignedRepName?: string;
  appBaseUrl?: string;
  /** Extra tokens merged last (contact custom fields, opportunity data, …). */
  extra?: Record<string, string>;
};

const APP_BASE_URL = "https://nexusflo24.lovable.app";

function deriveFirstName(lead: LeadLike): string {
  if (lead.first_name && String(lead.first_name).trim()) return String(lead.first_name).trim();
  const fn = (lead.full_name || "").trim();
  if (!fn) return "";
  return fn.split(/\s+/)[0] || "";
}

function deriveLastName(lead: LeadLike): string {
  if (lead.last_name && String(lead.last_name).trim()) return String(lead.last_name).trim();
  const fn = (lead.full_name || "").trim();
  if (!fn) return "";
  const parts = fn.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
}

/**
 * Build the variable map for a real lead. Empty strings are returned for
 * missing values so {{token}} renders as nothing rather than literal text.
 * `first_name` falls back to "there" so greetings stay natural.
 */
export function buildLeadVars(lead: LeadLike, opts: BuildVarsOptions = {}): Record<string, string> {
  const firstName = deriveFirstName(lead);
  const lastName = deriveLastName(lead);
  const fullName = (lead.full_name || [firstName, lastName].filter(Boolean).join(" ") || "").trim();
  const links = opts.links || {};
  const baseUrl = opts.appBaseUrl || APP_BASE_URL;

  return {
    // Identity
    first_name: firstName || "there",
    last_name: lastName,
    full_name: fullName,
    name: fullName || firstName || "there",
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",

    // CRM data
    source: lead.source || "",
    status: lead.status || "",
    lead_status: lead.status || "",
    lead_score: lead.score != null ? String(lead.score) : "",
    score: lead.score != null ? String(lead.score) : "",
    last_activity_date: fmtDate(lead.last_activity_at || lead.updated_at),
    assigned_rep: opts.assignedRepName || "",

    // Smart links (workspace-resolved with sensible fallbacks)
    booking_link: links.booking_link || `${baseUrl}/book`,
    funnel_link: links.funnel_link || `${baseUrl}`,
    offer_page_link: links.offer_page_link || `${baseUrl}`,
    webinar_link: links.webinar_link || `${baseUrl}`,
    checkout_link: links.checkout_link || `${baseUrl}`,
    next_step_link: links.next_step_link || "#next",
    external_url: links.external_url || baseUrl,
    unsubscribe_link: links.unsubscribe_link || `${baseUrl}/unsubscribe`,

    // Caller-supplied tokens (contact custom fields, opportunity reference, …)
    ...(opts.extra || {}),
  };
}

/**
 * Sample values used by editor "Send test" buttons so previews look real
 * instead of showing literal {{first_name}}.
 */
export function previewVars(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    first_name: "John",
    last_name: "Doe",
    full_name: "John Doe",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 555-123-4567",
    company: "Acme Inc.",
    source: "Landing Page",
    status: "Hot",
    lead_status: "Hot",
    lead_score: "85",
    score: "85",
    last_activity_date: fmtDate(new Date().toISOString()),
    assigned_rep: "Sarah Miller",
    assigned_user_email: "sarah@example.com",
    assigned_user_phone: "+1 555-987-6543",
    whatsapp_number: "+1 555-123-4567",
    service_interest: "Property inspection and maintenance",
    service_urgency: "Within 48 hours",
    preferred_channel: "Email",
    country_of_residence: "United Kingdom",
    service_location: "Lagos",
    enquiry_details: "Family support enquiry",
    enquiry_date: "Sep 18, 2026",
    opportunity_name: "John Doe – Property inspection and maintenance",
    opportunity_reference_number: "AFH-10482",
    opportunity_stage: "New Enquiry",
    opportunity_pipeline: "AfarHome Enquiries",
    opportunity_status: "Open",
    opportunity_priority: "High",
    opportunity_amount: "0",
    opportunity_currency: "GBP",
    opportunity_expected_close_date: "Sep 30, 2026",
    opportunity_service_required: "Property inspection and maintenance",
    opportunity_timeframe: "Within 48 hours",
    opportunity_preferred_contact: "Email",
    opportunity_secure_url: `${APP_BASE_URL}/dashboard/demo/crm/deals?deal=demo`,
    booking_link: `${APP_BASE_URL}/book/demo`,
    funnel_link: `${APP_BASE_URL}/f/offer`,
    offer_page_link: `${APP_BASE_URL}/offer`,
    webinar_link: `${APP_BASE_URL}/webinar`,
    checkout_link: `${APP_BASE_URL}/checkout`,
    next_step_link: "#next",
    external_url: "https://example.com",
    unsubscribe_link: `${APP_BASE_URL}/unsubscribe`,
    ...overrides,
  };
}

/**
 * Replace every {{token}} (case-insensitive, tolerant of whitespace and
 * pipe-fallback syntax `{{token | fallback}}`).
 *
 * Behaviour:
 *  - Known token with a value → value
 *  - Known token, empty value, fallback present → fallback
 *  - Known token, empty value, no fallback → "" (no raw {{...}} ever sent)
 *  - Unknown token → "" (also no raw {{...}} sent)
 */
/** Normalize a variable name to snake_case lowercase so all aliases match.
 *  Examples: "FirstName" → "first_name", "firstName" → "first_name",
 *  "firstname" → "firstname" (no change → caught by alias map below). */
function normalizeVarKey(rawInput: string): string {
  let raw = String(rawInput);

  // Dotted tokens, e.g. {{contact.first_name}}, {{opportunity.reference_number}},
  // {{assigned_user.name}} — flatten to the underlying variable name.
  if (raw.includes(".")) {
    const parts = raw.split(".");
    const prefix = parts[0].replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    const tail = parts.slice(1).join("_");
    if (["contact", "lead", "customer", "person"].includes(prefix)) {
      raw = tail;
    } else if (["opportunity", "deal"].includes(prefix)) {
      raw = `opportunity_${tail}`;
    } else if (["assigned_user", "owner", "coordinator", "user", "rep"].includes(prefix)) {
      raw = tail.toLowerCase() === "name" ? "assigned_rep" : `assigned_user_${tail}`;
    } else {
      raw = tail;
    }
  }

  // Insert underscore between lower→Upper boundaries, then lowercase.
  const snake = raw.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  // Common single-word aliases without separators
  const ALIASES: Record<string, string> = {
    firstname: "first_name",
    lastname: "last_name",
    fullname: "full_name",
    leadscore: "lead_score",
    leadstatus: "lead_status",
    lastactivitydate: "last_activity_date",
    assignedrep: "assigned_rep",
    bookinglink: "booking_link",
    funnellink: "funnel_link",
    offerpagelink: "offer_page_link",
    webinarlink: "webinar_link",
    checkoutlink: "checkout_link",
    nextsteplink: "next_step_link",
    externalurl: "external_url",
    unsubscribelink: "unsubscribe_link",
  };
  return ALIASES[snake] || snake;
}

export function interpolateText(template: string | null | undefined, vars: Record<string, string>): string {
  if (!template) return "";
  return String(template).replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g,
    (_match, rawKey: string, rawFallback?: string) => {
      const key = normalizeVarKey(rawKey);
      const fallback = (rawFallback ?? "").trim();
      const val = vars[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val);
      return fallback;
    },
  );
}

/** Strip any remaining {{...}} tokens (used as a final safety net). */
export function stripUnresolvedTokens(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*(?:\|[^}]*)?\s*\}\}/g, "");
}
