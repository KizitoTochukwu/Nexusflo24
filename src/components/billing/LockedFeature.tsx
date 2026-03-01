import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import UpgradeModal from "./UpgradeModal";
import type { PlanTier } from "@/lib/billing/planLimits";
import { usePlanGating } from "@/hooks/usePlanGating";

interface LockedFeatureProps {
  locked: boolean;
  featureName: string;
  requiredPlan?: PlanTier;
  children: ReactNode;
}

export default function LockedFeature({ locked, featureName, requiredPlan = "pro", children }: LockedFeatureProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isAdmin } = usePlanGating();

  // Admins are never locked out
  if (!locked || isAdmin) return <>{children}</>;

  return (
    <>
      <div className="relative cursor-pointer" onClick={() => setShowUpgrade(true)}>
        <div className="pointer-events-none select-none blur-[2px] opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-6 py-4 shadow-card">
            <Lock className="h-5 w-5 text-accent" />
            <p className="text-sm font-semibold">Upgrade to {requiredPlan === "agency" ? "Agency" : "Pro"}</p>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Unlock {featureName} and more premium features.
            </p>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={featureName}
        requiredPlan={requiredPlan}
      />
    </>
  );
}
