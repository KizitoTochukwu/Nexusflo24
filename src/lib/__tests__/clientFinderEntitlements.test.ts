import { describe, it, expect } from "vitest";

/**
 * Specification test for the server-side Client Finder entitlement gate.
 * The real check lives in supabase/functions/_shared/client-finder.ts
 * (checkEntitlement) and reads its limits from the database, so this test
 * pins the decision rules rather than the transport.
 */

type Decision =
  | { allowed: true }
  | { allowed: false; code: "suspended" | "disabled" | "limit_reached" | "unknown" };

const LIMIT_FOR: Record<string, string> = {
  emails: "monthly_emails",
  ai_ops: "monthly_ai_ops",
  verifications: "monthly_verifications",
  discoveries: "monthly_discoveries",
  campaigns: "max_campaigns",
  mailboxes: "max_mailboxes",
};

export function decide(
  ent: {
    enabled: boolean;
    suspended: boolean;
    limits: Record<string, number | boolean>;
    usage: Record<string, number>;
  } | null,
  usageKey: keyof typeof LIMIT_FOR,
  needed = 1,
): Decision {
  if (!ent) return { allowed: false, code: "unknown" };
  if (ent.suspended) return { allowed: false, code: "suspended" };
  if (ent.enabled === false) return { allowed: false, code: "disabled" };
  const limit = Number(ent.limits[LIMIT_FOR[usageKey]] ?? 0);
  const used = Number(ent.usage[usageKey] ?? 0);
  if (used + needed > limit) return { allowed: false, code: "limit_reached" };
  return { allowed: true };
}

const base = {
  enabled: true,
  suspended: false,
  limits: { monthly_emails: 10, monthly_ai_ops: 2, max_mailboxes: 1, max_campaigns: 1 },
  usage: { emails: 0, ai_ops: 0, mailboxes: 0, campaigns: 0 },
};

describe("client finder entitlement gate", () => {
  it("allows use inside the plan allowance", () => {
    expect(decide(base, "emails")).toEqual({ allowed: true });
  });

  it("blocks once the monthly allowance is reached", () => {
    const ent = { ...base, usage: { ...base.usage, emails: 10 } };
    expect(decide(ent, "emails")).toEqual({ allowed: false, code: "limit_reached" });
  });

  it("blocks a batch that would exceed the allowance", () => {
    const ent = { ...base, usage: { ...base.usage, emails: 8 } };
    expect(decide(ent, "emails", 3)).toEqual({ allowed: false, code: "limit_reached" });
    expect(decide(ent, "emails", 2)).toEqual({ allowed: true });
  });

  it("suspension beats every other check", () => {
    const ent = { ...base, suspended: true };
    expect(decide(ent, "ai_ops")).toEqual({ allowed: false, code: "suspended" });
  });

  it("a disabled workspace cannot send or run AI", () => {
    const ent = { ...base, enabled: false };
    expect(decide(ent, "ai_ops")).toEqual({ allowed: false, code: "disabled" });
  });

  it("fails closed when the allowance cannot be read", () => {
    expect(decide(null, "emails")).toEqual({ allowed: false, code: "unknown" });
  });

  it("counts mailboxes and campaigns against their own caps", () => {
    const ent = { ...base, usage: { ...base.usage, mailboxes: 1, campaigns: 1 } };
    expect(decide(ent, "mailboxes")).toEqual({ allowed: false, code: "limit_reached" });
    expect(decide(ent, "campaigns")).toEqual({ allowed: false, code: "limit_reached" });
  });

  it("treats a missing limit as zero rather than unlimited", () => {
    const ent = { ...base, limits: {} };
    expect(decide(ent, "verifications")).toEqual({ allowed: false, code: "limit_reached" });
  });
});
