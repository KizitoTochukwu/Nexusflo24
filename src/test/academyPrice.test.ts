import { describe, it, expect } from "vitest";
import { convertCoursePrice } from "@/lib/currency/academyPrice";

const rates = { USD: 1, GBP: 0.79, EUR: 0.92, NGN: 1600 };

describe("convertCoursePrice", () => {
  it("keeps £49 unchanged in GBP", () => expect(convertCoursePrice(4900, "GBP", "GBP", rates)).toBe(4900));
  it("converts £49 to $62.00", () => expect(convertCoursePrice(4900, "GBP", "USD", rates)).toBe(6200));
  it("converts £49 to €57.00", () => expect(convertCoursePrice(4900, "GBP", "EUR", rates)).toBe(5700));
  it("converts £49 to ₦99,200 (nearest ₦100)", () => expect(convertCoursePrice(4900, "GBP", "NGN", rates)).toBe(9920000));
  it("free stays free", () => expect(convertCoursePrice(0, "GBP", "USD", rates)).toBe(0));
});
