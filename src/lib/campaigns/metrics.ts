/**
 * Canonical campaign metric aggregation.
 *
 * Rates are derived from delivery records (campaign_messages) rather than the
 * stored campaigns.open_rate / click_rate columns, which are not always kept
 * up to date. Stored values are only used as a fallback when a campaign has no
 * delivery records at all.
 */

export type MetricMessage = {
  campaign_id?: string;
  lead_id?: string | null;
  id?: string;
  delivery_status?: string | null;
  opened?: boolean | null;
  clicked?: boolean | null;
  replied?: boolean | null;
};

export type CampaignMetrics = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  /** 0-1 fraction */
  openRate: number;
  /** 0-1 fraction */
  clickRate: number;
};

const DELIVERED_STATUSES = new Set(["delivered", "read"]);

function recipientKey(m: MetricMessage, idx: number): string {
  return m.lead_id ?? `msg:${m.id ?? idx}`;
}

export function computeCampaignMetrics(messages: MetricMessage[] | null | undefined): CampaignMetrics {
  const list = messages ?? [];
  const sent = list.length;
  let delivered = 0;
  let replied = 0;
  const openedRecipients = new Set<string>();
  const clickedRecipients = new Set<string>();

  list.forEach((m, idx) => {
    if (m.delivery_status && DELIVERED_STATUSES.has(m.delivery_status)) delivered++;
    if (m.replied) replied++;
    if (m.opened) openedRecipients.add(recipientKey(m, idx));
    if (m.clicked) clickedRecipients.add(recipientKey(m, idx));
  });

  const opened = openedRecipients.size;
  const clicked = clickedRecipients.size;

  return {
    sent,
    delivered,
    opened,
    clicked,
    replied,
    openRate: sent > 0 ? opened / sent : 0,
    clickRate: delivered > 0 ? clicked / delivered : 0,
  };
}

/** Group flat message rows by campaign and compute metrics for each. */
export function groupCampaignMetrics(
  messages: MetricMessage[] | null | undefined,
): Record<string, CampaignMetrics> {
  const groups: Record<string, MetricMessage[]> = {};
  for (const m of messages ?? []) {
    const key = m.campaign_id;
    if (!key) continue;
    (groups[key] ||= []).push(m);
  }
  const out: Record<string, CampaignMetrics> = {};
  for (const [id, rows] of Object.entries(groups)) out[id] = computeCampaignMetrics(rows);
  return out;
}

export type StoredCampaignRates = {
  sent_count?: number | null;
  open_rate?: number | null;
  click_rate?: number | null;
};

/**
 * Metrics for a campaign, falling back to the stored columns when there are no
 * delivery records yet.
 */
export function resolveCampaignMetrics(
  stored: StoredCampaignRates,
  derived: CampaignMetrics | undefined,
): CampaignMetrics {
  if (derived && derived.sent > 0) return derived;
  const sent = stored.sent_count ?? 0;
  return {
    sent,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    openRate: stored.open_rate ?? 0,
    clickRate: stored.click_rate ?? 0,
  };
}

export function formatRate(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
