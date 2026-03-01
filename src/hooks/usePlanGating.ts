import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdminRole";
import { getPlanTier, getPlanLimits, PLAN_LIMITS, type PlanTier, type PlanLimits } from "@/lib/billing/planLimits";

const ADMIN_LIMITS: PlanLimits = {
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
};

export function usePlanGating() {
  const { subscription, subLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const loading = subLoading || adminLoading;

  // Admin override — bypass all plan checks
  if (isAdmin) {
    return {
      tier: "agency" as PlanTier,
      limits: ADMIN_LIMITS,
      isPro: true,
      isAgency: true,
      isFree: false,
      isActive: true,
      isAdmin: true,
      isBillingWarning: false,
      canAccess: (_feature: keyof PlanLimits) => true,
      checkLimit: (_feature: "maxLeads" | "maxFunnels" | "maxCampaigns", _currentCount: number) => ({
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
      }),
      loading,
    };
  }

  const tier: PlanTier = getPlanTier(subscription?.plan);
  const limits: PlanLimits = getPlanLimits(subscription?.plan);
  const isActive = subscription ? ["active", "trialing"].includes(subscription.status) : false;

  const effectiveTier: PlanTier = isActive ? tier : "free";
  const effectiveLimits = isActive ? limits : getPlanLimits("free");

  const isPro = effectiveTier === "pro" || effectiveTier === "agency";
  const isAgency = effectiveTier === "agency";
  const isFree = effectiveTier === "free";

  const isBillingWarning = subscription
    ? ["past_due", "incomplete", "canceled", "incomplete_expired"].includes(subscription.status)
    : false;

  function canAccess(feature: keyof PlanLimits): boolean {
    const val = effectiveLimits[feature];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val > 0;
    return false;
  }

  function checkLimit(feature: "maxLeads" | "maxFunnels" | "maxCampaigns", currentCount: number) {
    const limit = effectiveLimits[feature];
    const remaining = Math.max(0, limit - currentCount);
    return { allowed: currentCount < limit, limit, remaining };
  }

  return {
    tier: effectiveTier,
    limits: effectiveLimits,
    isPro,
    isAgency,
    isFree,
    isActive,
    isAdmin: false,
    isBillingWarning,
    canAccess,
    checkLimit,
    loading,
  };
}
