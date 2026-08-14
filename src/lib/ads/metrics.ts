import { format, startOfMonth, subDays, differenceInCalendarDays } from "date-fns";
import type { AdProvider } from "./constants";

export type DateRangePreset = "today" | "7d" | "30d" | "month" | "custom";

export type ResolvedRange = {
  from: Date;
  to: Date;
  /** Immediately preceding window of the same length, used for comparisons. */
  prevFrom: Date;
  prevTo: Date;
};

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

export function resolveRange(
  preset: DateRangePreset,
  custom?: { from?: string; to?: string },
): ResolvedRange {
  const today = new Date();
  let from: Date;
  let to: Date = today;

  switch (preset) {
    case "today":
      from = today;
      break;
    case "7d":
      from = subDays(today, 6);
      break;
    case "month":
      from = startOfMonth(today);
      break;
    case "custom":
      from = custom?.from ? new Date(custom.from) : subDays(today, 29);
      to = custom?.to ? new Date(custom.to) : today;
      break;
    case "30d":
    default:
      from = subDays(today, 29);
  }

  const span = Math.max(0, differenceInCalendarDays(to, from));
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, span);
  return { from, to, prevFrom, prevTo };
}

export const iso = (d: Date) => format(d, "yyyy-MM-dd");

export type MetricRow = {
  date: string;
  provider: string;
  campaign_id: string;
  ad_account_id: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualified_leads: number;
  appointments: number;
  won_deals: number;
  revenue: number;
};

export type MetricTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualifiedLeads: number;
  appointments: number;
  wonDeals: number;
  revenue: number;
  ctr: number;
  cpl: number;
  cpql: number;
  roas: number;
};

export const EMPTY_TOTALS: MetricTotals = {
  spend: 0, impressions: 0, clicks: 0, leads: 0, qualifiedLeads: 0,
  appointments: 0, wonDeals: 0, revenue: 0, ctr: 0, cpl: 0, cpql: 0, roas: 0,
};

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function sumMetrics(rows: MetricRow[]): MetricTotals {
  const t = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.spend) || 0;
      acc.impressions += Number(r.impressions) || 0;
      acc.clicks += Number(r.clicks) || 0;
      acc.leads += Number(r.leads) || 0;
      acc.qualifiedLeads += Number(r.qualified_leads) || 0;
      acc.appointments += Number(r.appointments) || 0;
      acc.wonDeals += Number(r.won_deals) || 0;
      acc.revenue += Number(r.revenue) || 0;
      return acc;
    },
    { ...EMPTY_TOTALS },
  );

  t.ctr = safeDiv(t.clicks, t.impressions) * 100;
  t.cpl = safeDiv(t.spend, t.leads);
  t.cpql = safeDiv(t.spend, t.qualifiedLeads);
  t.roas = safeDiv(t.revenue, t.spend);
  return t;
}

/** Percentage change between two values; null when there is no baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function groupByProvider(rows: MetricRow[]): Record<string, MetricTotals> {
  const byProvider: Record<string, MetricRow[]> = {};
  for (const r of rows) (byProvider[r.provider] ||= []).push(r);
  return Object.fromEntries(Object.entries(byProvider).map(([k, v]) => [k, sumMetrics(v)]));
}

export function groupByCampaign(rows: MetricRow[]): Record<string, MetricTotals> {
  const byCampaign: Record<string, MetricRow[]> = {};
  for (const r of rows) (byCampaign[r.campaign_id] ||= []).push(r);
  return Object.fromEntries(Object.entries(byCampaign).map(([k, v]) => [k, sumMetrics(v)]));
}

export function seriesByDate(rows: MetricRow[]): Array<{ date: string } & MetricTotals> {
  const byDate: Record<string, MetricRow[]> = {};
  for (const r of rows) (byDate[r.date] ||= []).push(r);
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...sumMetrics(v) }));
}

export function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency, maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatPct(value: number, digits = 2) {
  return `${(value || 0).toFixed(digits)}%`;
}

export const PROVIDER_ORDER: AdProvider[] = ["meta", "google", "linkedin"];
