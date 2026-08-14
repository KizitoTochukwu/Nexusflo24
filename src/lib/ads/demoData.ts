import { format, subDays } from "date-fns";
import type { AdProvider } from "./constants";

/**
 * Deterministic-ish sample advertising data so the Ads Hub looks complete
 * before any live channel is authorised. Everything written is flagged
 * `is_demo: true` so it can be cleared in one call.
 */

type DemoCampaign = {
  key: string;
  provider: AdProvider;
  name: string;
  objective: string;
  sub_channel: string;
  status: "active" | "paused" | "ended";
  budget: number;
  quality: number; // 0.6 poor → 1.4 strong
  audience: string;
};

export const DEMO_ACCOUNTS: { provider: AdProvider; name: string; external: string; currency: string }[] = [
  { provider: "meta", name: "NexusFlo24 — Meta Business", external: "act_1029384756", currency: "GBP" },
  { provider: "google", name: "NexusFlo24 — Google Ads", external: "482-193-7745", currency: "GBP" },
  { provider: "linkedin", name: "NexusFlo24 — LinkedIn B2B", external: "li_50291845", currency: "GBP" },
];

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  { key: "meta-leadgen", provider: "meta", name: "UK Lead Gen — Free Trial", objective: "Lead generation", sub_channel: "Facebook", status: "active", budget: 60, quality: 1.35, audience: "UK, 25–54, small business owners" },
  { key: "meta-retarget", provider: "meta", name: "Retargeting — Site Visitors 30d", objective: "Conversions", sub_channel: "Instagram", status: "active", budget: 35, quality: 1.15, audience: "Website visitors, 30 days" },
  { key: "meta-awareness", provider: "meta", name: "Brand Awareness — Reels", objective: "Awareness", sub_channel: "Instagram", status: "paused", budget: 25, quality: 0.7, audience: "Broad UK, interests: marketing" },
  { key: "google-search", provider: "google", name: "Search — Marketing Automation", objective: "Lead generation", sub_channel: "Search", status: "active", budget: 80, quality: 1.25, audience: "High-intent search keywords" },
  { key: "google-pmax", provider: "google", name: "Performance Max — All Products", objective: "Conversions", sub_channel: "Performance Max", status: "active", budget: 55, quality: 0.95, audience: "Automated audience signals" },
  { key: "google-youtube", provider: "google", name: "YouTube — Demo Walkthrough", objective: "Consideration", sub_channel: "YouTube", status: "ended", budget: 30, quality: 0.65, audience: "In-market: business software" },
  { key: "li-leadgen", provider: "linkedin", name: "Lead Gen Forms — Agencies", objective: "Lead generation", sub_channel: "Lead Gen Forms", status: "active", budget: 70, quality: 1.1, audience: "Agency owners, 11–200 staff, UK" },
  { key: "li-sponsored", provider: "linkedin", name: "Sponsored Content — Case Study", objective: "Consideration", sub_channel: "Sponsored Content", status: "paused", budget: 40, quality: 0.8, audience: "Marketing managers, UK & IE" },
];

const FIRST_NAMES = ["Amara", "Tom", "Priya", "Daniel", "Grace", "Olu", "Ellie", "Marcus", "Nadia", "Sam", "Chloe", "Ibrahim", "Rachel", "Ben", "Sofia", "Josh"];
const LAST_NAMES = ["Okafor", "Bennett", "Sharma", "Wright", "Adeyemi", "Clarke", "Novak", "Hughes", "Ellis", "Marshall", "Doyle", "Khan", "Freeman", "Turner"];
const LANDING_PAGES = ["/pricing", "/features", "/f/free-trial", "/book", "/sectors/marketing-agencies"];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export type DemoMetricRow = {
  campaignKey: string;
  provider: AdProvider;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualified_leads: number;
  appointments: number;
  won_deals: number;
  revenue: number;
};

/** Build 60 days of daily metrics per campaign. */
export function buildDemoMetrics(days = 60): DemoMetricRow[] {
  const rows: DemoMetricRow[] = [];
  DEMO_CAMPAIGNS.forEach((c, ci) => {
    const rand = seededRandom(1000 + ci * 37);
    for (let d = days - 1; d >= 0; d--) {
      const date = format(subDays(new Date(), d), "yyyy-MM-dd");
      // Ended / paused campaigns taper off toward the present day.
      const activity = c.status === "ended" ? Math.max(0, (d - 20) / days) : c.status === "paused" ? Math.max(0.15, (d + 5) / days) : 1;
      if (activity <= 0) continue;
      const noise = 0.75 + rand() * 0.5;
      const spend = Math.round(c.budget * activity * noise * 100) / 100;
      const impressions = Math.round(spend * (95 + rand() * 60));
      const clicks = Math.round(impressions * (0.012 + rand() * 0.02) * c.quality);
      const leads = Math.round(clicks * (0.06 + rand() * 0.07) * c.quality);
      const qualified = Math.round(leads * (0.3 + rand() * 0.25) * c.quality);
      const appointments = Math.round(qualified * (0.35 + rand() * 0.2));
      const won = Math.round(appointments * (0.25 + rand() * 0.2));
      const revenue = Math.round(won * (380 + rand() * 520));
      rows.push({
        campaignKey: c.key, provider: c.provider, date, spend,
        impressions, clicks, leads, qualified_leads: qualified,
        appointments, won_deals: won, revenue,
      });
    }
  });
  return rows;
}

export type DemoLead = {
  campaignKey: string;
  provider: AdProvider;
  name: string;
  email: string;
  landing_page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  ad_set_name: string;
  creative_name: string;
  first_touch_at: string;
  last_touch_at: string;
  touch_count: number;
  is_qualified: boolean;
  has_appointment: boolean;
  deal_status: string;
  cost_per_lead: number;
  revenue_attributed: number;
};

export function buildDemoLeads(count = 48): DemoLead[] {
  const rand = seededRandom(777);
  const leads: DemoLead[] = [];
  for (let i = 0; i < count; i++) {
    const c = DEMO_CAMPAIGNS[Math.floor(rand() * DEMO_CAMPAIGNS.length)];
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const daysAgo = Math.floor(rand() * 45);
    const firstTouch = subDays(new Date(), daysAgo + Math.floor(rand() * 6));
    const lastTouch = subDays(new Date(), daysAgo);
    const qualified = rand() < 0.45 * c.quality;
    const appointment = qualified && rand() < 0.55;
    const won = appointment && rand() < 0.4;
    leads.push({
      campaignKey: c.key,
      provider: c.provider,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      landing_page: LANDING_PAGES[Math.floor(rand() * LANDING_PAGES.length)],
      utm_source: c.provider === "meta" ? "facebook" : c.provider === "google" ? "google" : "linkedin",
      utm_medium: "paid_social",
      utm_campaign: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ad_set_name: `${c.sub_channel} — ${["Broad", "Lookalike 1%", "Retarget 30d", "Keyword: automation"][Math.floor(rand() * 4)]}`,
      creative_name: `${["Video", "Carousel", "Single image", "Lead form"][Math.floor(rand() * 4)]} v${1 + Math.floor(rand() * 3)}`,
      first_touch_at: firstTouch.toISOString(),
      last_touch_at: lastTouch.toISOString(),
      touch_count: 1 + Math.floor(rand() * 4),
      is_qualified: qualified,
      has_appointment: appointment,
      deal_status: won ? "won" : appointment ? "open" : rand() < 0.2 ? "lost" : "none",
      cost_per_lead: Math.round((12 + rand() * 40) * 100) / 100,
      revenue_attributed: won ? Math.round(420 + rand() * 900) : 0,
    });
  }
  return leads;
}

export const DEMO_AD_SETS = (campaignKey: string) => {
  const c = DEMO_CAMPAIGNS.find((x) => x.key === campaignKey);
  const base = c?.sub_channel ?? "Ad set";
  return ["Broad audience", "Lookalike 1%", "Retargeting 30d"].map((n) => `${base} — ${n}`);
};
