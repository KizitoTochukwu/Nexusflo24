export function addSkippedStep(skipped: string[], stepId: string): string[] {
  return skipped.includes(stepId) ? skipped : [...skipped, stepId];
}

export function cleanPipelineStages(stages: string[]): string[] {
  return stages.map((stage) => stage.trim()).filter(Boolean);
}

export function onboardingStatusLabel(liveDone: boolean, savedDone: unknown): "Yes" | "Not yet" {
  return liveDone || Boolean(savedDone) ? "Yes" : "Not yet";
}