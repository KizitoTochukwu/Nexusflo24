import { describe, it, expect } from "vitest";

/**
 * The promotion rule lives in the edge-function shared module
 * (supabase/functions/_shared/commerce-crm.ts). It is re-declared here as a
 * specification test — if the edge function changes, this test should be
 * updated in lockstep.
 */
function commerceEventMarksCustomer(eventType: string): boolean {
  return eventType === "order_paid" || eventType === "subscription_renewed";
}

describe("commerceEventMarksCustomer", () => {
  it("promotes on paid orders", () => {
    expect(commerceEventMarksCustomer("order_paid")).toBe(true);
  });
  it("promotes on subscription renewals", () => {
    expect(commerceEventMarksCustomer("subscription_renewed")).toBe(true);
  });
  it("never promotes on failed, abandoned, refunded or cancelled events", () => {
    for (const evt of [
      "payment_failed",
      "checkout_abandoned",
      "order_refunded",
      "subscription_cancelled",
      "order_placed",
      "subscription_started",
    ]) {
      expect(commerceEventMarksCustomer(evt), evt).toBe(false);
    }
  });
});
