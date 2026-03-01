import { usePlanGating } from "@/hooks/usePlanGating";
import { PLAN_DISPLAY } from "@/lib/billing/planLimits";
import { Shield } from "lucide-react";

export default function PlanBadge() {
  const { tier, isAdmin, loading } = usePlanGating();
  if (loading) return null;

  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );
  }

  const display = PLAN_DISPLAY[tier];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${display.badgeClass}`}>
      {display.label}
    </span>
  );
}
