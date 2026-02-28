/**
 * Deterministic demo data generator.
 * Uses a simple hash of the workspaceId so numbers stay consistent across refreshes.
 */

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator (Mulberry32)
function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function seededRange(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function seededFloat(seed: number, min: number, max: number, decimals = 1): string {
  const val = seededRandom(seed) * (max - min) + min;
  return val.toFixed(decimals);
}

export type DemoVariant = "default" | "saas" | "ecommerce" | "agency";

const VARIANT_CONFIGS: Record<DemoVariant, {
  leadsRange: [number, number];
  totalLeadsRange: [number, number];
  openRateRange: [number, number];
  clickRateRange: [number, number];
  revenueRange: [number, number];
  campaignNames: string[];
}> = {
  default: {
    leadsRange: [12, 48],
    totalLeadsRange: [500, 3000],
    openRateRange: [28, 52],
    clickRateRange: [2, 12],
    revenueRange: [5000, 60000],
    campaignNames: ["Welcome Series", "Newsletter", "Flash Sale", "Product Launch", "Re-engagement"],
  },
  saas: {
    leadsRange: [8, 35],
    totalLeadsRange: [300, 2000],
    openRateRange: [32, 55],
    clickRateRange: [4, 15],
    revenueRange: [8000, 45000],
    campaignNames: ["Onboarding Flow", "Feature Update", "Upgrade Promo", "Churn Prevention", "Webinar Invite"],
  },
  ecommerce: {
    leadsRange: [20, 80],
    totalLeadsRange: [800, 5000],
    openRateRange: [22, 42],
    clickRateRange: [3, 10],
    revenueRange: [15000, 120000],
    campaignNames: ["Summer Sale", "Cart Abandon", "VIP Offer", "New Arrivals", "Holiday Promo"],
  },
  agency: {
    leadsRange: [15, 55],
    totalLeadsRange: [600, 4000],
    openRateRange: [30, 50],
    clickRateRange: [5, 14],
    revenueRange: [10000, 80000],
    campaignNames: ["Client Outreach", "Case Study", "Monthly Report", "Referral Program", "Upsell Campaign"],
  },
};

export function generateDemoMetrics(workspaceId: string, variant: DemoVariant = "default") {
  const base = hashCode(workspaceId);
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.default;

  const newLeadsToday = seededRange(base + 1, config.leadsRange[0], config.leadsRange[1]);
  const totalLeads = seededRange(base + 2, config.totalLeadsRange[0], config.totalLeadsRange[1]);
  const openRate = seededFloat(base + 3, config.openRateRange[0], config.openRateRange[1]);
  const clickRate = seededFloat(base + 4, config.clickRateRange[0], config.clickRateRange[1]);
  const revenue = seededRange(base + 5, config.revenueRange[0], config.revenueRange[1]);

  // Leads over time chart (7 days)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const leadsChartData = days.map((day, i) => ({
    day,
    leads: seededRange(base + 10 + i, Math.floor(newLeadsToday * 0.3), Math.floor(newLeadsToday * 1.8)),
  }));

  // Campaign performance chart
  const campaignChartData = config.campaignNames.slice(0, 4).map((name, i) => {
    const sent = seededRange(base + 20 + i, 800, 6000);
    const opened = Math.round(sent * seededRandom(base + 30 + i) * 0.5 + sent * 0.15);
    const clicked = Math.round(opened * seededRandom(base + 40 + i) * 0.3 + opened * 0.05);
    return { name, sent, opened: Math.min(opened, sent), clicked: Math.min(clicked, opened) };
  });

  // Demo recent leads
  const demoNames = ["Alex Morgan", "Jordan Lee", "Sam Rivera", "Taylor Chen", "Casey Kim"];
  const demoSources = ["Landing Page", "Google Ads", "Referral", "LinkedIn", "Organic"];
  const demoStatuses = ["New", "Warm", "Hot", "New", "Warm"];
  const recentLeads = demoNames.map((name, i) => ({
    id: `demo-${i}`,
    full_name: name,
    email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
    source: demoSources[i],
    score: seededRange(base + 50 + i, 20, 95),
    status: demoStatuses[i],
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  return {
    totalLeads,
    newLeadsToday,
    openRate,
    clickRate,
    hasEmailData: true,
    leadsChartData,
    recentLeads,
    campaignChartData,
    hasCampaignData: true,
    revenue,
    isDemo: true,
  };
}
