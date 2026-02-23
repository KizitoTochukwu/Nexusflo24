export type PlanTier = "free" | "pro" | "agency";

export interface PlanLimits {
  maxLeads: number;
  maxFunnels: number;
  maxCampaigns: number;
  whatsappAutomation: boolean;
  smsAutomation: boolean;
  aiCopyUnlimited: boolean;
  aiCopyDailyLimit: number;
  behaviourTriggeredAutomation: boolean;
  advancedAnalytics: boolean;
  multiWorkspace: boolean;
  whiteLabelBranding: boolean;
  teamInvites: boolean;
  apiAccess: boolean;
  watermarkedExports: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxLeads: 100,
    maxFunnels: 1,
    maxCampaigns: 1,
    whatsappAutomation: false,
    smsAutomation: false,
    aiCopyUnlimited: false,
    aiCopyDailyLimit: 10,
    behaviourTriggeredAutomation: false,
    advancedAnalytics: false,
    multiWorkspace: false,
    whiteLabelBranding: false,
    teamInvites: false,
    apiAccess: false,
    watermarkedExports: true,
  },
  pro: {
    maxLeads: Infinity,
    maxFunnels: 5,
    maxCampaigns: Infinity,
    whatsappAutomation: true,
    smsAutomation: true,
    aiCopyUnlimited: true,
    aiCopyDailyLimit: Infinity,
    behaviourTriggeredAutomation: true,
    advancedAnalytics: false,
    multiWorkspace: false,
    whiteLabelBranding: false,
    teamInvites: false,
    apiAccess: false,
    watermarkedExports: false,
  },
  agency: {
    maxLeads: Infinity,
    maxFunnels: Infinity,
    maxCampaigns: Infinity,
    whatsappAutomation: true,
    smsAutomation: true,
    aiCopyUnlimited: true,
    aiCopyDailyLimit: Infinity,
    behaviourTriggeredAutomation: true,
    advancedAnalytics: true,
    multiWorkspace: true,
    whiteLabelBranding: true,
    teamInvites: true,
    apiAccess: true,
    watermarkedExports: false,
  },
};

export function getPlanTier(plan: string | null | undefined): PlanTier {
  if (plan === "pro") return "pro";
  if (plan === "agency") return "agency";
  return "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[getPlanTier(plan)];
}

export const PLAN_DISPLAY: Record<PlanTier, { label: string; color: string; badgeClass: string }> = {
  free: { label: "Free", color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", color: "text-accent", badgeClass: "bg-accent/20 text-accent border border-accent/30" },
  agency: { label: "Agency", color: "text-accent", badgeClass: "bg-gradient-to-r from-accent to-gold-light text-primary font-bold" },
};
