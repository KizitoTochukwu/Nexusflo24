export interface SubscriptionData {
  plan: string;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

export function hasProAccess(sub: SubscriptionData | null): boolean {
  if (!sub) return false;
  return ["trialing", "active"].includes(sub.status) && ["pro", "enterprise"].includes(sub.plan);
}

export function hasEnterpriseAccess(sub: SubscriptionData | null): boolean {
  if (!sub) return false;
  return ["trialing", "active"].includes(sub.status) && sub.plan === "enterprise";
}

export function hasPaidAccess(sub: SubscriptionData | null): boolean {
  if (!sub) return false;
  return ["trialing", "active"].includes(sub.status) && ["starter", "plus", "pro", "enterprise"].includes(sub.plan);
}
