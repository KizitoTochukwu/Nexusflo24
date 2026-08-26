import { describe, it, expect } from "vitest";
import { normalizeEmail, normalizePhone, matchKeysFor } from "../contactNormalization";

describe("normalizeEmail (mirrors crm_normalize_email)", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });
  it("is case-insensitive so dedupe by email is case-insensitive", () => {
    expect(normalizeEmail("LEAD@X.COM")).toBe(normalizeEmail("lead@x.com"));
  });
  it("returns null for empty input", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("normalizePhone (mirrors crm_normalize_phone)", () => {
  it("strips formatting characters and keeps the + prefix", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });
  it("converts a leading 00 to +", () => {
    expect(normalizePhone("0044 7700 900123")).toBe("+447700900123");
  });
  it("prefixes national-format numbers with +", () => {
    expect(normalizePhone("07700 900123")).toBe("+07700900123");
  });
  it("returns null for unusable numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("---")).toBeNull();
  });
  it("matches the same number across formats (E.164 equivalence)", () => {
    const a = normalizePhone("+44 7700 900 123");
    const b = normalizePhone("00447700900123");
    const c = normalizePhone("+44-7700-900123");
    expect(a).toBe("+447700900123");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
});

describe("matchKeysFor (crm_upsert_contact match priority)", () => {
  it("returns keys in canonical priority order: external id, email, phone", () => {
    expect(matchKeysFor({ externalId: "x", email: "a@b.co", phone: "+447700900123" }))
      .toEqual(["external_id", "email", "phone"]);
  });
  it("omits unusable identifiers", () => {
    expect(matchKeysFor({ phone: "+447700900123" })).toEqual(["phone"]);
    expect(matchKeysFor({ email: "a@b.co" })).toEqual(["email"]);
    expect(matchKeysFor({ phone: "12", email: " " })).toEqual([]);
    expect(matchKeysFor({})).toEqual([]);
  });
});
