import { usePlanGating } from "@/hooks/usePlanGating";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function FreePlanBanner() {
  const { isFree, loading } = usePlanGating();

  if (loading || !isFree) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <p className="flex-1 text-sm text-muted-foreground">
        You're on the <span className="font-semibold text-foreground">Free Plan</span>. Upgrade to unlock unlimited leads, automations, and more.
      </p>
      <Link
        to="/pricing"
        className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90"
      >
        Upgrade
      </Link>
    </div>
  );
}
