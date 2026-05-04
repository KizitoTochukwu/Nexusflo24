// Shared phone normalization for edge functions.
// Normalizes a raw phone string to E.164 format (e.g. +447517327597).
// Returns null if the input cannot be confidently normalized.

export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[\s\-()]/g, "");
  if (!cleaned) return null;

  // Already E.164
  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  }
  // 00-prefixed international
  if (cleaned.startsWith("00")) {
    const intl = `+${cleaned.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null;
  }
  // UK local (07XXXXXXXXX → +447XXXXXXXXX)
  if (/^0\d{10}$/.test(cleaned)) {
    return `+44${cleaned.slice(1)}`;
  }
  // Looks international but missing +
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

export function isValidE164(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
