import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdminRole";
import { getPlanTier, getPlanLimits, PLAN_LIMITS, type PlanTier, type PlanLimits, type CountableLimit } from "@/lib/billing/planLimits";

const ADMIN_LIMITS: PlanLimits = {
  ...PLAN_LIMITS.enterprise,
  maxForms: Infinity,
  maxFunnels: Infinity,
  maxBookingPages: Infinity,
  maxLeads: Infinity,
  maxCampaigns: Infinity,
  maxAutomations: Infinity,
  aiCopyDailyLimit: Infinity,
  maxSeats: Infinity,
  monthlyCredits: { email: Infinity, sms: Infinity, whatsapp: Infinity },
};

export function usePlanGating() {
  const { subscription, subLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const loading = subLoading || adminLoading;

  // Admin override — bypass all plan checks
  if (isAdmin) {
    return {
      tier: "enterprise" as PlanTier,
      limits: ADMIN_LIMITS,
      isPro: true,
      isEnterprise: true,
      isStarter: false,
      isActive: true,
      isAdmin: true,
      isBillingWarning: false,
      canAccess: (_feature: keyof PlanLimits) => true,
      checkLimit: (_feature: CountableLimit, _currentCount: number) => ({
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

  const effectiveTier: PlanTier = isActive ? tier : "starter";
  const effectiveLimits = isActive ? limits : getPlanLimits("starter");

  const isPro = effectiveTier === "pro" || effectiveTier === "enterprise";
  const isEnterprise = effectiveTier === "enterprise";
  const isStarter = effectiveTier === "starter";

  const isBillingWarning = subscription
    ? ["past_due", "incomplete", "canceled", "incomplete_expired"].includes(subscription.status)
    : false;

  function canAccess(feature: keyof PlanLimits): boolean {
    const val = effectiveLimits[feature];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val > 0;
    return false;
  }

  function checkLimit(feature: CountableLimit, currentCount: number) {
    const limit = effectiveLimits[feature];
    const remaining = Math.max(0, limit - currentCount);
    return { allowed: currentCount < limit, limit, remaining };
  }

  return {
    tier: effectiveTier,
    limits: effectiveLimits,
    isPro,
    isEnterprise,
    isStarter,
    isActive,
    isAdmin: false,
    isBillingWarning,
    canAccess,
    checkLimit,
    loading,
  };
}
