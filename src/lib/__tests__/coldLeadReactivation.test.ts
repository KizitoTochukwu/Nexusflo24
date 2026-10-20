import { describe, it, expect } from "vitest";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";

const t = AUTOMATION_TEMPLATES.find((x) => x.slug === "cold-lead-reactivation-14d")!;
const delays = t.steps.filter((s) => s.step_type === "delay").map((s) => (s.config as any).duration);

describe("cold lead reactivation template", () => {
  it("sends on Days 1, 4 and 8, then Dormant 7 days after the last message", () => {
    expect(delays).toEqual([1, 3, 4, 7]);
  });
  it("stops on unsubscribe, booking and reply", () => {
    const types = t.exit_criteria.map((c: any) => c.tag ?? c.type);
    expect(types).toEqual(expect.arrayContaining(["unsubscribed", "appointment_booked", "reactivated"]));
  });
  it("marks non-responders Dormant", () => {
    expect(t.steps.some((s) => (s.config as any).new_status === "Dormant")).toBe(true);
  });
});
