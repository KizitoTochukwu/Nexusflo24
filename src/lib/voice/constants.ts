/**
 * NexusFlo Voice — shared constants.
 * Live calling is not enabled yet: the gateway, provider and realtime model
 * are configured in later milestones. Every surface must state this truthfully.
 */

export const VOICE_PROVIDER_LABEL = "Twilio Programmable Voice";
export const VOICE_REALTIME_LABEL = "OpenAI Realtime";
export const VOICE_GATEWAY_LABEL = "Google Cloud Run voice gateway";

/** Live calling stays off until the gateway and realtime credentials exist. */
export const VOICE_LIVE_CALLING_ENABLED = false;

export const VOICE_SETUP_STEPS = [
  {
    key: "gateway",
    label: "Voice gateway",
    detail: `${VOICE_GATEWAY_LABEL} — persistent WebSocket service, deployed separately.`,
  },
  {
    key: "realtime",
    label: "Realtime voice AI",
    detail: `${VOICE_REALTIME_LABEL} key, stored securely on the server.`,
  },
  {
    key: "telephony",
    label: "Telephone provider",
    detail: `${VOICE_PROVIDER_LABEL} — UK numbers first, provider-agnostic design.`,
  },
] as const;

/** Starter entitlement defaults. Stored per workspace, never hard-coded in logic. */
export const VOICE_STARTER_ENTITLEMENT = {
  includedMinutes: 200,
  maxAssistants: 1,
  maxNumbers: 1,
  maxConcurrentCalls: 1,
  warnAtPercents: [80, 100] as const,
  overageEnabled: false,
};

export const VOICE_ASSISTANT_STATUSES = [
  "draft", "testing", "active", "paused", "degraded", "archived",
] as const;

export type VoiceAssistantStatus = (typeof VOICE_ASSISTANT_STATUSES)[number];

export const VOICE_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  testing: "bg-accent/15 text-accent-foreground",
  active: "bg-primary/10 text-primary",
  paused: "bg-muted text-muted-foreground",
  degraded: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export function formatMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}
