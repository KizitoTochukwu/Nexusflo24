/**
 * Client-side mirror of the database normalisation helpers
 * (crm_normalize_email / crm_normalize_phone). Used for grouping, display and
 * duplicate hints — the database functions remain the source of truth for
 * matching inside crm_upsert_contact. Keep these implementations byte-for-byte
 * equivalent to the SQL in the Phase 1 migration.
 */

/** Mirrors crm_normalize_email: trim + lowercase, null when empty. */
export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e === "" ? null : e;
}

/**
 * Mirrors crm_normalize_phone: strip non-digits; a leading "+" keeps the
 * digits with a "+" prefix; a leading "00" becomes "+"; fewer than 7 digits
 * is null; anything else is returned with a "+" prefix.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (raw === "") return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length < 7) return null;
  return `+${digits}`;
}

/**
 * Match priority used by crm_upsert_contact — exposed for tests and UI
 * explanations: 1) external id, 2) normalised email, 3) normalised phone.
 */
export const CONTACT_MATCH_ORDER = ["external_id", "email", "phone"] as const;
export type ContactMatchKey = (typeof CONTACT_MATCH_ORDER)[number];

/** Decides which identifiers a payload can match on, in priority order. */
export function matchKeysFor(payload: {
  externalId?: string | null;
  email?: string | null;
  phone?: string | null;
}): ContactMatchKey[] {
  const keys: ContactMatchKey[] = [];
  if (payload.externalId?.trim()) keys.push("external_id");
  if (normalizeEmail(payload.email)) keys.push("email");
  if (normalizePhone(payload.phone)) keys.push("phone");
  return keys;
}
