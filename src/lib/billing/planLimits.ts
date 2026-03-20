export type PlanTier = "starter" | "plus" | "pro" | "enterprise";

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
  monthlyCredits: { email: number; sms: number; whatsapp: number };
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    maxLeads: 250,
    maxFunnels: 1,
    maxCampaigns: 2,
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
  plus: {
    maxLeads: 2500,
    maxFunnels: 3,
    maxCampaigns: 10,
    whatsappAutomation: true,
    smsAutomation: false,
    aiCopyUnlimited: false,
    aiCopyDailyLimit: 50,
    behaviourTriggeredAutomation: true,
    advancedAnalytics: false,
    multiWorkspace: false,
    whiteLabelBranding: false,
    teamInvites: false,
    apiAccess: false,
    watermarkedExports: false,
  },
  pro: {
    maxLeads: Infinity,
    maxFunnels: 10,
    maxCampaigns: Infinity,
    whatsappAutomation: true,
    smsAutomation: true,
    aiCopyUnlimited: true,
    aiCopyDailyLimit: Infinity,
    behaviourTriggeredAutomation: true,
    advancedAnalytics: true,
    multiWorkspace: false,
    whiteLabelBranding: false,
    teamInvites: true,
    apiAccess: false,
    watermarkedExports: false,
  },
  enterprise: {
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
  if (plan === "starter") return "starter";
  if (plan === "plus") return "plus";
  if (plan === "pro") return "pro";
  if (plan === "enterprise") return "enterprise";
  return "starter";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[getPlanTier(plan)];
}

export const PLAN_DISPLAY: Record<PlanTier, { label: string; color: string; badgeClass: string }> = {
  starter: { label: "Starter", color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  plus: { label: "Plus", color: "text-accent", badgeClass: "bg-accent/15 text-accent border border-accent/25" },
  pro: { label: "Pro", color: "text-accent", badgeClass: "bg-accent/20 text-accent border border-accent/30" },
  enterprise: { label: "Enterprise", color: "text-accent", badgeClass: "bg-gradient-to-r from-accent to-gold-light text-primary font-bold" },
};
