// Client-side mirror of supabase/functions/_shared/interpolate-vars.ts.
// Used by editor "Send test" buttons so test sends render real sample values
// instead of literal {{first_name}} reaching the recipient.

const APP_BASE_URL = "https://nexusflo24.lovable.app";

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
    last_activity_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
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
 * `{{token | fallback}}` syntax). Unknown / empty tokens render as "".
 */
function normalizeVarKey(raw: string): string {
  let normalized = String(raw);
  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    const prefix = parts[0].replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    const tail = parts.slice(1).join("_");
    if (["contact", "lead", "customer", "person"].includes(prefix)) normalized = tail;
    else if (["opportunity", "deal"].includes(prefix)) normalized = `opportunity_${tail}`;
    else if (["assigned_user", "owner", "coordinator", "user", "rep"].includes(prefix)) {
      normalized = tail.toLowerCase() === "name" ? "assigned_rep" : `assigned_user_${tail}`;
    } else normalized = tail;
  }
  const snake = normalized.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
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
    (_m, rawKey: string, rawFallback?: string) => {
      const key = normalizeVarKey(rawKey);
      const fallback = (rawFallback ?? "").trim();
      const val = vars[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val);
      return fallback;
    },
  );
}
