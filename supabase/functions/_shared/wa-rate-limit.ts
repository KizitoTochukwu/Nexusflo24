// Per-phone WhatsApp pacing + daily-tier guard.
//
// Meta limits (Cloud API):
//   • ~80 msg/sec/phone burst   → we self-cap at ~25/sec (safe headroom)
//   • 250 / 1K / 10K / 100K per 24h based on messaging_limit_tier
//
// The pacer is an in-memory per-cold-start token bucket keyed by phone_number_id.
// Edge functions are short-lived; a per-invocation cap is enough to prevent
// bursty campaign batches from tripping Meta's per-second throttle.

const MIN_INTERVAL_MS = 40; // ~25 msg/sec/phone
const lastSendByPhone = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function enforceWaPacing(phoneNumberId: string): Promise<void> {
  if (!phoneNumberId) return;
  const now = Date.now();
  const last = lastSendByPhone.get(phoneNumberId) ?? 0;
  const wait = MIN_INTERVAL_MS - (now - last);
  if (wait > 0) await sleep(wait);
  lastSendByPhone.set(phoneNumberId, Date.now());
}

export type TierCheck =
  | { ok: true; used: number; limit: number; warn: boolean }
  | { ok: false; used: number; limit: number; reason: "tier_exceeded" };

/**
 * Check today's outbound WA count against the workspace's tier_limit.
 * Returns ok=false when the workspace has already sent at/over its 24h tier.
 * Returns warn=true when within 10% of the cap so callers can log a warning.
 */
export async function checkDailyTier(
  adminClient: any,
  workspaceId: string,
): Promise<TierCheck> {
  const { data: ws } = await adminClient
    .from("whatsapp_settings")
    .select("tier_limit")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const limit = Number(ws?.tier_limit ?? 1000);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("direction", "outbound")
    .gte("created_at", since);
  const used = Number(count ?? 0);

  if (used >= limit) return { ok: false, used, limit, reason: "tier_exceeded" };
  const warn = used >= Math.floor(limit * 0.9);
  return { ok: true, used, limit, warn };
}
