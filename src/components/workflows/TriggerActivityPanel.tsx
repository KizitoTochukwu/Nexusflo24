// Recent enrolment-trigger activity for a single workflow/automation.
// Shows, in plain English, what the trigger did the last few times it fired —
// including the times it deliberately did nothing and why.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity } from "lucide-react";

interface Props {
  recordId?: string;
  recordKind?: "workflow" | "automation";
  workspaceId?: string;
}

type Row = {
  id: string;
  event_type: string | null;
  created_at: string;
  message?: string | null;
  details?: any;
  status?: string | null;
};

const LABELS: Record<string, { text: string; tone: "good" | "info" | "warn" }> = {
  enrolled: { text: "Started", tone: "good" },
  out_of_scope: { text: "Outside scope", tone: "info" },
  filtered_out: { text: "Filtered out", tone: "info" },
  suppressed: { text: "Suppressed", tone: "info" },
  duplicate_event: { text: "Duplicate ignored", tone: "info" },
  no_match: { text: "No match", tone: "warn" },
  reenrolment_blocked: { text: "Already run before", tone: "info" },
};

export default function TriggerActivityPanel({ recordId, recordKind = "workflow", workspaceId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["trigger-activity", recordKind, recordId],
    enabled: !!recordId,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Row[]> => {
      if (recordKind === "automation") {
        const { data, error } = await supabase
          .from("automation_logs")
          .select("id,event_type,status,details,created_at")
          .eq("automation_id", recordId!)
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return (data || []) as Row[];
      }
      const { data, error } = await supabase
        .from("workflow_logs")
        .select("id,event_type,message,details,created_at")
        .eq("workflow_id", recordId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  if (!recordId) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">
          Recent trigger activity
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : !data || data.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          Nothing yet. Activity appears here the first time this trigger is offered an event.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((row) => {
            const key = String(row.event_type || "");
            const label = LABELS[key] ?? { text: key.replace(/_/g, " ") || "Event", tone: "info" as const };
            const detail =
              row.message ||
              row.details?.reason ||
              (row.details?.scope_key ? `Scope: ${row.details.scope_key}` : "") ||
              row.status ||
              "";
            return (
              <li key={row.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge
                    variant={label.tone === "good" ? "default" : label.tone === "warn" ? "destructive" : "outline"}
                    className="mb-1"
                  >
                    {label.text}
                  </Badge>
                  {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
