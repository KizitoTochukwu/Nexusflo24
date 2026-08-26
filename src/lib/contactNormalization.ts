/**
 * Client-side mirror of the database normalisation helpers
 * (crm_normalize_email / crm_normalize_phone). Used for grouping, display and
 * duplicate hints — the database functions remain the source of truth for
 * matching inside crm_upsert_contact.
 */

/** Lowercases, trims, and removes Gmail-style +tag aliases and dot tricks. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return null;
  const [local, domain] = e.split("@");
  if (!local || !domain) return null;
  // Strip +tags for everyone; strip dots for Gmail only.
  const noTag = local.split("+")[0];
  const normalizedLocal = domain === "gmail.com" || domain === "googlemail.com"
    ? noTag.replace(/\./g, "")
    : noTag;
  if (!normalizedLocal) return null;
  return `${normalizedLocal}@${domain}`;
}

/**
 * Normalises a phone towards E.164: strips everything except digits and a
 * leading +, converts a leading 00 to +, and returns null when fewer than 7
 * digits remain. A leading 0 trunk prefix is dropped when a country code is
 * clearly present (e.g. 0044 7... → +447...).
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = phone.trim();
  if (!p) return null;
  const hadPlus = p.startsWith("+") || p.startsWith("00");
  p = p.replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.length < 7 || p.length > 15) return null;
  return hadPlus ? `+${p}` : p;
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
