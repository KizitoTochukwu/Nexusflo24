// Warns when an automation/workflow trigger has no scope at all (no form,
// folder, tag or source), which makes it a catch-all: every single record of
// that type enters it. Also shows how many other live automations already fire
// on the same event, so overlap is visible before switching one on.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  workspaceId?: string;
  recordId?: string;
  triggerEvent?: string | null;
  scopeText?: string;
}

export default function UnscopedTriggerWarning({
  workspaceId,
  recordId,
  triggerEvent,
  scopeText,
}: Props) {
  const [others, setOthers] = useState<string[]>([]);

  const unscoped = !scopeText || !scopeText.trim();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!workspaceId || !triggerEvent || !unscoped) {
        setOthers([]);
        return;
      }
      const { data } = await supabase
        .from("automations")
        .select("id, name, trigger_config")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("trigger_type", triggerEvent)
        .limit(50);
      if (cancelled) return;
      const list = (data ?? [])
        .filter((a) => a.id !== recordId)
        .filter((a) => Object.keys((a.trigger_config as Record<string, unknown>) || {}).length === 0)
        .map((a) => a.name as string);
      setOthers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, recordId, triggerEvent, unscoped]);

  if (!triggerEvent || !unscoped) return null;

  return (
    <div className="mt-2 flex gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <div className="font-medium">No scope set — this runs for every record.</div>
        <p className="mt-0.5">
          Add a form, folder, tag or source under "Edit trigger" so only the right people
          enter this sequence.
        </p>
        {others.length > 0 && (
          <p className="mt-1">
            {others.length} other live automation{others.length === 1 ? "" : "s"} already fire
            on this same event with no scope: {others.slice(0, 4).join(", ")}
            {others.length > 4 ? "…" : ""}. Anyone matching will receive all of them.
          </p>
        )}
      </div>
    </div>
  );
}
