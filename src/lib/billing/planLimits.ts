export type PlanTier = "starter" | "plus" | "pro" | "enterprise";

export interface PlanLimits {
  // Capture
  maxForms: number;
  maxFunnels: number;
  maxBookingPages: number;
  // CRM & pipeline
  maxLeads: number;
  smartLists: boolean;
  // AI & automation
  maxCampaigns: number;
  maxAutomations: number;
  aiCopyDailyLimit: number;
  aiQualification: boolean;
  aiSalesCloser: boolean;
  whatsappAutomation: boolean;
  smsAutomation: boolean;
  behaviourTriggeredAutomation: boolean;
  aiWorkflowGenerator: boolean;
  // Insights
  advancedAnalytics: boolean;
  watermarkedExports: boolean;
  // Team & advanced
  maxSeats: number;
  teamInvites: boolean;
  multiWorkspace: boolean;
  whiteLabelBranding: boolean;
  apiAccess: boolean;
  mcpConnections: boolean;
  // Communication Wallet (monthly allowance, top-up packs available)
  monthlyCredits: { email: number; sms: number; whatsapp: number };
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    maxForms: 3,
    maxFunnels: 1,
    maxBookingPages: 1,
    maxLeads: 1000,
    smartLists: false,
    maxCampaigns: 3,
    maxAutomations: 2,
    aiCopyDailyLimit: 15,
    aiQualification: false,
    aiSalesCloser: false,
    whatsappAutomation: true,
    smsAutomation: false,
    behaviourTriggeredAutomation: false,
    aiWorkflowGenerator: false,
    advancedAnalytics: false,
    watermarkedExports: true,
    maxSeats: 1,
    teamInvites: false,
    multiWorkspace: false,
    whiteLabelBranding: false,
    apiAccess: false,
    mcpConnections: false,
    monthlyCredits: { email: 1000, sms: 0, whatsapp: 100 },
  },
  plus: {
    maxForms: 15,
    maxFunnels: 5,
    maxBookingPages: 3,
    maxLeads: 5000,
    smartLists: true,
    maxCampaigns: 15,
    maxAutomations: 10,
    aiCopyDailyLimit: 100,
    aiQualification: true,
    aiSalesCloser: false,
    whatsappAutomation: true,
    smsAutomation: true,
    behaviourTriggeredAutomation: true,
    aiWorkflowGenerator: false,
    advancedAnalytics: false,
    watermarkedExports: false,
    maxSeats: 3,
    teamInvites: true,
    multiWorkspace: false,
    whiteLabelBranding: false,
    apiAccess: false,
    mcpConnections: false,
    monthlyCredits: { email: 5000, sms: 250, whatsapp: 500 },
  },
  pro: {
    maxForms: 50,
    maxFunnels: 20,
    maxBookingPages: 10,
    maxLeads: 25000,
    smartLists: true,
    maxCampaigns: 60,
    maxAutomations: 50,
    aiCopyDailyLimit: 500,
    aiQualification: true,
    aiSalesCloser: true,
    whatsappAutomation: true,
    smsAutomation: true,
    behaviourTriggeredAutomation: true,
    aiWorkflowGenerator: true,
    advancedAnalytics: true,
    watermarkedExports: false,
    maxSeats: 10,
    teamInvites: true,
    multiWorkspace: false,
    whiteLabelBranding: false,
    apiAccess: false,
    mcpConnections: true,
    monthlyCredits: { email: 20000, sms: 1000, whatsapp: 2000 },
  },
  enterprise: {
    maxForms: 250,
    maxFunnels: 100,
    maxBookingPages: 50,
    maxLeads: 100000,
    smartLists: true,
    maxCampaigns: 300,
    maxAutomations: 250,
    aiCopyDailyLimit: 2000,
    aiQualification: true,
    aiSalesCloser: true,
    whatsappAutomation: true,
    smsAutomation: true,
    behaviourTriggeredAutomation: true,
    aiWorkflowGenerator: true,
    advancedAnalytics: true,
    watermarkedExports: false,
    maxSeats: 50,
    teamInvites: true,
    multiWorkspace: true,
    whiteLabelBranding: true,
    apiAccess: true,
    mcpConnections: true,
    monthlyCredits: { email: 75000, sms: 4000, whatsapp: 6000 },
  },
};

export type CountableLimit =
  | "maxLeads"
  | "maxFunnels"
  | "maxCampaigns"
  | "maxForms"
  | "maxBookingPages"
  | "maxAutomations"
  | "maxSeats";

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
