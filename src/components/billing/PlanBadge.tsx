import { usePlanGating } from "@/hooks/usePlanGating";
import { PLAN_DISPLAY } from "@/lib/billing/planLimits";

export default function PlanBadge() {
  const { tier, loading } = usePlanGating();
  if (loading) return null;

  const display = PLAN_DISPLAY[tier];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${display.badgeClass}`}>
      {display.label}
    </span>
  );
}
