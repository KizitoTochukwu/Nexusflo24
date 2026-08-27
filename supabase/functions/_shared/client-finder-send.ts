// Shared sending helpers for the AI Client Finder outbound engine.

export const MERGE_VARS = [
  "first_name",
  "full_name",
  "company",
  "job_title",
  "industry",
  "city",
  "country",
  "sender_name",
  "booking_url",
] as const;

export type MergeVars = Partial<Record<(typeof MERGE_VARS)[number], string>>;

/** Optional variables get a neutral fallback; anything else missing blocks the send. */
const OPTIONAL_FALLBACKS: Record<string, string> = {
  first_name: "there",
};

export interface RenderResult {
  text: string;
  missing: string[];
  unknown: string[];
}

/**
 * Replace {{var}} tokens. Returns which known variables had no value
 * (`missing`) and which tokens are not part of the supported set (`unknown`).
 * Callers must refuse to send when either list is non-empty after fallbacks.
 */
export function renderTemplate(template: string, vars: MergeVars): RenderResult {
  const missing: string[] = [];
  const unknown: string[] = [];
  const known = new Set<string>(MERGE_VARS as readonly string[]);

  const text = String(template ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, rawKey: string) => {
    const key = rawKey.trim();
    if (!known.has(key)) {
      if (!unknown.includes(key)) unknown.push(key);
      return `{{${key}}}`;
    }
    const value = (vars as Record<string, string | undefined>)[key];
    if (value && value.trim()) return value.trim();
    if (key in OPTIONAL_FALLBACKS) return OPTIONAL_FALLBACKS[key];
    if (!missing.includes(key)) missing.push(key);
    return "";
  });

  return { text, missing, unknown };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text body -> simple paragraph HTML (the editor stores plain text). */
export function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(String(email ?? "").trim());
}

/**
 * True when `at` falls inside the campaign's allowed sending window,
 * evaluated in the campaign's own IANA time zone.
 */
export function withinSendingWindow(
  at: Date,
  timezone: string,
  sendDays: number[],
  startHour: number,
  endHour: number,
): boolean {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(at);
  }
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dayMap[weekdayName] ?? 1;
  const days = sendDays?.length ? sendDays : [1, 2, 3, 4, 5];
  if (!days.includes(dow)) return false;
  return hour >= startHour && hour < endHour;
}

/** Deterministic idempotency key: one email per enrolment + step, ever. */
export function sendIdempotencyKey(enrolmentId: string, stepNumber: number): string {
  return `cf:${enrolmentId}:${stepNumber}`;
}

export function randomSpacingSeconds(min: number, max: number): number {
  const lo = Math.max(0, min || 0);
  const hi = Math.max(lo, max || lo);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
