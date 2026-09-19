import { describe, it, expect } from "vitest";
import {
  matchTriggerScope,
  evaluateFilterGroups,
  canReEnrol,
  scopeValueId,
} from "@/lib/workflows/triggerMatch";

describe("scope matching", () => {
  it("treats blank and __any__ as any value", () => {
    expect(scopeValueId("__any__")).toBe("");
    expect(matchTriggerScope({ triggerConfig: { form_id: "__any__" }, eventConfig: {} }).matched).toBe(true);
  });

  it("ignores non-scope settings such as booking_link", () => {
    const r = matchTriggerScope({ triggerConfig: { booking_link: "https://x" }, eventConfig: {} });
    expect(r.matched).toBe(true);
  });

  it("narrows by form id from the event", () => {
    const cfg = { form_id: "abc" };
    expect(matchTriggerScope({ triggerConfig: cfg, eventConfig: { form_id: "abc" } }).matched).toBe(true);
    expect(matchTriggerScope({ triggerConfig: cfg, eventConfig: { form_id: "zzz" } }).matched).toBe(false);
  });

  it("does not fire a scoped trigger when the event omits the key", () => {
    expect(matchTriggerScope({ triggerConfig: { form_id: "abc" }, eventConfig: {} }).matched).toBe(false);
  });

  it("assumes scope is met in test mode", () => {
    expect(
      matchTriggerScope({ triggerConfig: { form_id: "abc" }, eventConfig: {}, assumeScopeSatisfied: true }).matched,
    ).toBe(true);
  });

  it("checks record tags and source", () => {
    const record = { tags: ["Facebook Ad"], source: "meta" };
    expect(matchTriggerScope({ triggerConfig: { tags: "facebook ad" }, record }).matched).toBe(true);
    expect(matchTriggerScope({ triggerConfig: { tags: "other" }, record }).matched).toBe(false);
    expect(matchTriggerScope({ triggerConfig: { lead_source: "meta" }, record }).matched).toBe(true);
  });

  it("accepts {id,label} scope objects", () => {
    const r = matchTriggerScope({
      triggerConfig: { funnel_id: { id: "f1", label: "Webinar" } },
      eventConfig: { funnel_id: "f1" },
    });
    expect(r.matched).toBe(true);
  });
});

describe("filters", () => {
  const lead = { full_name: "Jane Doe", email: "j@x.com", score: 40, tags: ["vip"] };

  it("passes with no groups", () => {
    expect(evaluateFilterGroups(lead, []).passed).toBe(true);
  });

  it("maps the friendly name property to full_name", () => {
    expect(evaluateFilterGroups(lead, [{ conditions: [{ property: "name", operator: "contains", value: "jane" }] }]).passed).toBe(true);
  });

  it("supports legacy operator keys", () => {
    expect(evaluateFilterGroups(lead, [{ conditions: [{ property: "email", operator: "eq", value: "j@x.com" }] }]).passed).toBe(true);
    expect(evaluateFilterGroups(lead, [{ conditions: [{ property: "email", operator: "neq", value: "j@x.com" }] }]).passed).toBe(false);
  });

  it("honours OR groups", () => {
    const r = evaluateFilterGroups(lead, [
      { combinator: "OR", conditions: [{ property: "score", operator: "gt", value: "99" }, { property: "email", operator: "exists" }] },
    ]);
    expect(r.passed).toBe(true);
  });
});

describe("re-enrolment", () => {
  it("allows the first run", () => {
    expect(canReEnrol({ mode: "never" }, null)).toBe(true);
  });
  it("blocks a repeat when never", () => {
    expect(canReEnrol({ mode: "never" }, { started_at: new Date().toISOString(), status: "completed" })).toBe(false);
  });
  it("allows every event", () => {
    expect(canReEnrol({ mode: "every_event" }, { started_at: new Date().toISOString() })).toBe(true);
  });
  it("respects the wait window", () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(canReEnrol({ mode: "after_wait", wait_amount: 2, wait_unit: "hours" }, { started_at: recent })).toBe(false);
    const old = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(canReEnrol({ mode: "after_wait", wait_amount: 2, wait_unit: "hours" }, { started_at: old })).toBe(true);
  });
  it("honours the legacy allow flag when no mode is set", () => {
    expect(canReEnrol(null, { started_at: new Date().toISOString() }, true)).toBe(true);
    expect(canReEnrol(null, { started_at: new Date().toISOString() }, false)).toBe(false);
  });
});
