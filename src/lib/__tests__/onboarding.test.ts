import { describe, expect, it } from "vitest";
import { addSkippedStep, cleanPipelineStages, onboardingStatusLabel } from "@/lib/onboarding";

describe("onboarding helpers", () => {
  it("persists a newly skipped step without duplicates", () => {
    expect(addSkippedStep(["contacts"], "email")).toEqual(["contacts", "email"]);
    expect(addSkippedStep(["contacts"], "contacts")).toEqual(["contacts"]);
  });

  it("removes empty pipeline stages and trims names", () => {
    expect(cleanPipelineStages([" New ", "", "  ", "Won"])).toEqual(["New", "Won"]);
  });

  it("prefers live completion while retaining saved fallback", () => {
    expect(onboardingStatusLabel(true, false)).toBe("Yes");
    expect(onboardingStatusLabel(false, true)).toBe("Yes");
    expect(onboardingStatusLabel(false, false)).toBe("Not yet");
  });
});