import { useAuth } from "@/contexts/AuthContext";
import { getPlanTier, getPlanLimits, type PlanTier, type PlanLimits } from "@/lib/billing/planLimits";

export function usePlanGating() {
  const { subscription, subLoading } = useAuth();

  const tier: PlanTier = getPlanTier(subscription?.plan);
  const limits: PlanLimits = getPlanLimits(subscription?.plan);
  const isActive = subscription ? ["active", "trialing"].includes(subscription.status) : false;

  // If subscription is canceled/past_due, treat as free
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

  function checkLimit(feature: "maxLeads" | "maxFunnels" | "maxCampaigns", currentCount: number): { allowed: boolean; limit: number; remaining: number } {
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
    isBillingWarning,
    canAccess,
    checkLimit,
    loading: subLoading,
  };
}
