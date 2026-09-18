import { describe, it, expect } from "vitest";
import {
  DEFAULT_ASSISTANT_CONFIG, VOICE_WIZARD_STEPS, activationChecklist, buildRuntimePrompt,
  canActivate, isWizardStepComplete, normalizeAssistantConfig,
} from "@/lib/voice/assistantConfig";

const ready = {
  ...DEFAULT_ASSISTANT_CONFIG,
  businessName: "AfarHome",
  greeting: "Thanks for calling AfarHome, how can I help?",
  services: ["Home and welfare checks"],
  pipelineId: "p1",
  stageId: "s1",
};

describe("voice assistant wizard", () => {
  it("has twelve steps ending in review", () => {
    expect(VOICE_WIZARD_STEPS).toHaveLength(12);
    expect(VOICE_WIZARD_STEPS.at(-1)?.key).toBe("review");
  });

  it("marks steps complete only when filled in", () => {
    expect(isWizardStepComplete("identity", DEFAULT_ASSISTANT_CONFIG, "")).toBe(false);
    expect(isWizardStepComplete("identity", ready, "Front desk")).toBe(true);
    expect(isWizardStepComplete("greeting", DEFAULT_ASSISTANT_CONFIG, "x")).toBe(false);
    expect(isWizardStepComplete("greeting", ready, "x")).toBe(true);
  });

  it("only requires booking and transfer details when those are switched on", () => {
    expect(isWizardStepComplete("booking", ready, "x")).toBe(true);
    expect(isWizardStepComplete("booking", { ...ready, bookingEnabled: true }, "x")).toBe(false);
    expect(isWizardStepComplete("transfer", { ...ready, transferEnabled: true }, "x")).toBe(false);
    expect(isWizardStepComplete("transfer", { ...ready, transferEnabled: true, transferNumber: "+442012345678" }, "x")).toBe(true);
  });

  it("restores saved drafts without losing defaults", () => {
    const cfg = normalizeAssistantConfig({ businessName: "AfarHome", businessHours: { mode: "hours" } });
    expect(cfg.businessName).toBe("AfarHome");
    expect(cfg.businessHours.days).toHaveLength(7);
    expect(cfg.intakeQuestions.length).toBeGreaterThan(0);
  });
});

describe("runtime prompt", () => {
  it("is generated from the configuration", () => {
    const prompt = buildRuntimePrompt(ready, "Front desk");
    expect(prompt).toContain("Front desk");
    expect(prompt).toContain("AfarHome");
    expect(prompt).toContain("Home and welfare checks");
    expect(prompt).toContain("cannot book appointments");
    expect(prompt).toContain("never guess");
  });

  it("states the recording announcement and disclaimer when set", () => {
    const prompt = buildRuntimePrompt(
      { ...ready, recordingEnabled: true, emergencyDisclaimer: "We are not an emergency service." },
      "Front desk",
    );
    expect(prompt).toContain("This call may be recorded");
    expect(prompt).toContain("not an emergency service");
  });
});

describe("activation checklist", () => {
  const base = { config: ready, name: "Front desk", publishedVersion: 1, numbersAssigned: 1, knowledgeCount: 1 };

  it("blocks going live while the platform dependencies are missing", () => {
    const checks = activationChecklist(base);
    expect(canActivate(checks)).toBe(false);
    expect(checks.find((c) => c.key === "gateway")?.ok).toBe(false);
  });

  it("flags unfinished setup and missing numbers", () => {
    const checks = activationChecklist({ ...base, publishedVersion: null, numbersAssigned: 0, config: DEFAULT_ASSISTANT_CONFIG, name: "" });
    expect(checks.find((c) => c.key === "setup")?.ok).toBe(false);
    expect(checks.find((c) => c.key === "published")?.ok).toBe(false);
    expect(checks.find((c) => c.key === "number")?.ok).toBe(false);
  });

  it("treats knowledge as optional", () => {
    const checks = activationChecklist({ ...base, knowledgeCount: 0 });
    expect(checks.find((c) => c.key === "knowledge")?.blocking).toBe(false);
  });
});
