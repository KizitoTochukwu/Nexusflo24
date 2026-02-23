import { usePlanGating } from "@/hooks/usePlanGating";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

export default function BillingWarningBanner() {
  const { isBillingWarning } = usePlanGating();
  const { subscription } = useAuth();
  const workspaceId = useWorkspaceId();

  if (!isBillingWarning || !subscription) return null;

  const message =
    subscription.status === "past_due"
      ? "Your payment is past due. Please update your payment method to avoid losing access."
      : subscription.status === "canceled"
      ? "Your subscription has been canceled. You've been downgraded to the Free plan."
      : "There's an issue with your subscription. Please check your billing details.";

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      <Link
        to={`/dashboard/${workspaceId}/settings`}
        className="shrink-0 rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
      >
        Fix Billing
      </Link>
    </div>
  );
}
