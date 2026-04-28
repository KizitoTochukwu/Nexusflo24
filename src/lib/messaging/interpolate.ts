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
export function interpolateText(template: string | null | undefined, vars: Record<string, string>): string {
  if (!template) return "";
  return String(template).replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g,
    (_m, rawKey: string, rawFallback?: string) => {
      const key = String(rawKey).toLowerCase();
      const fallback = (rawFallback ?? "").trim();
      const val = vars[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val);
      return fallback;
    },
  );
}
