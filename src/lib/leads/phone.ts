// Frontend phone normalization. Mirrors supabase/functions/_shared/phone.ts.
// Converts raw phone input to E.164 (e.g. "07517 327597" → "+447517327597").

export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[\s\-()]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  }
  if (cleaned.startsWith("00")) {
    const intl = `+${cleaned.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(intl) ? intl : null;
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return `+44${cleaned.slice(1)}`;
  }
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

export function isValidE164(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
