import { describe, it, expect } from "vitest";
import { normalizeEmail, normalizePhone, matchKeysFor } from "../contactNormalization";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });
  it("strips +tag aliases", () => {
    expect(normalizeEmail("jane+newsletter@example.com")).toBe("jane@example.com");
  });
  it("strips dots for gmail only", () => {
    expect(normalizeEmail("jane.doe@gmail.com")).toBe("janedoe@gmail.com");
    expect(normalizeEmail("jane.doe@outlook.com")).toBe("jane.doe@outlook.com");
  });
  it("returns null for invalid input", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail("@example.com")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips formatting characters", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });
  it("converts 00 prefix to +", () => {
    expect(normalizePhone("0044 7700 900123")).toBe("+447700900123");
  });
  it("keeps national numbers without plus as digits", () => {
    expect(normalizePhone("07700 900123")).toBe("07700900123");
  });
  it("returns null for unusable numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("+".padEnd(17, "1"))).toBeNull();
  });
  it("matches the same number across formats", () => {
    const a = normalizePhone("+44 7700 900 123");
    const b = normalizePhone("00447700900123");
    const c = normalizePhone("+44-7700-900123");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("matchKeysFor", () => {
  it("returns keys in canonical priority order", () => {
    expect(matchKeysFor({ externalId: "x", email: "a@b.co", phone: "+447700900123" }))
      .toEqual(["external_id", "email", "phone"]);
  });
  it("omits unusable identifiers", () => {
    expect(matchKeysFor({ email: "junk", phone: "12" })).toEqual([]);
    expect(matchKeysFor({ phone: "+447700900123" })).toEqual(["phone"]);
    expect(matchKeysFor({})).toEqual([]);
  });
});
