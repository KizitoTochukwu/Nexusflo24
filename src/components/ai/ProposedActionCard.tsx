import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Loader2, X } from "lucide-react";
import TrustBadge from "@/components/ai/TrustBadge";
import type { ProposedAction } from "@/hooks/useNexusAi";

const LABELS: Record<string, string> = {
  update_lead_status: "Update contact status",
  update_lead_stage: "Move pipeline stage",
  add_lead_tag: "Add tag",
  remove_lead_tag: "Remove tag",
  assign_lead_owner: "Assign owner",
  create_lead_task: "Create task",
  create_lead_note: "Add note",
  pause_automation: "Pause automation",
  activate_automation: "Activate automation",
  pause_campaign: "Pause campaign",
};

export default function ProposedActionCard({
  action,
  onResolve,
}: {
  action: ProposedAction;
  onResolve: (id: string, decision: "confirm" | "cancel") => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
  const resolved = action.status === "completed" || action.status === "cancelled";

  const handle = async (decision: "confirm" | "cancel") => {
    setBusy(decision);
    await onResolve(action.id, decision);
    setBusy(null);
  };

  const changeEntries = Object.entries(action.changes || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{action.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {LABELS[action.action_type] ?? action.action_type}
          </p>
        </div>
        <TrustBadge level="action" className="shrink-0" />
      </div>

      {action.summary && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{action.summary}</p>
      )}

      {changeEntries.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-md bg-background/70 p-2 text-[11px]">
          {changeEntries.map(([k, v]) => (
            <li key={k} className="flex gap-1.5">
              <span className="text-muted-foreground">{k}:</span>
              <span className="font-medium text-foreground break-all">{String(v)}</span>
            </li>
          ))}
        </ul>
      )}

      {resolved ? (
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          {action.status === "completed" ? "✓ Applied to your workspace" : "Dismissed"}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 bg-accent text-accent-foreground hover:bg-gold-dark text-xs"
            disabled={!!busy}
            onClick={() => handle("confirm")}
          >
            {busy === "confirm" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Apply change
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!!busy}
            onClick={() => handle("cancel")}
          >
            {busy === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Dismiss
          </Button>
        </div>
      )}
    </Card>
  );
}
