// Shared input validation and error sanitization utilities

export function sanitizeString(input: unknown, maxLength = 255): string | null {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();
  if (str.length === 0) return null;
  return str.slice(0, maxLength);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

export function sanitizeTags(tags: unknown, maxTags = 20, maxLen = 50): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, maxLen))
    .filter((t) => t.length > 0)
    .slice(0, maxTags);
}

export function safeErrorResponse(err: unknown): string {
  if (err instanceof Error) {
    console.error("[Edge Function Error]", err.message, err.stack);
    if (err.message.includes("duplicate key")) return "Resource already exists.";
    if (err.message.includes("permission denied")) return "Access denied.";
    if (err.message.includes("violates row-level security")) return "Access denied.";
  } else {
    console.error("[Edge Function Error]", err);
  }
  return "An internal error occurred. Please try again.";
}
