// Parse Supabase/Postgres errors raised when creating or updating leads
// and return a user-friendly message. Detects unique-constraint conflicts
// on (user_id, phone) and (user_id, email).

export type LeadDbErrorKind = "duplicate_phone" | "duplicate_email" | "other";

export interface ParsedLeadDbError {
  kind: LeadDbErrorKind;
  message: string;
  field?: "phone" | "email";
}

export function parseLeadDbError(err: unknown): ParsedLeadDbError {
  const anyErr = err as any;
  const code = anyErr?.code || anyErr?.details?.code;
  const rawMessage =
    anyErr?.message ||
    anyErr?.error_description ||
    (typeof err === "string" ? err : "Failed to save lead");

  const isDuplicate =
    code === "23505" || /duplicate key value/i.test(String(rawMessage));

  if (isDuplicate) {
    if (/phone/i.test(String(rawMessage))) {
      return {
        kind: "duplicate_phone",
        field: "phone",
        message: "A lead with this phone number already exists.",
      };
    }
    if (/email/i.test(String(rawMessage))) {
      return {
        kind: "duplicate_email",
        field: "email",
        message: "A lead with this email already exists.",
      };
    }
    return {
      kind: "other",
      message: "A lead with these details already exists.",
    };
  }

  return { kind: "other", message: String(rawMessage) };
}
