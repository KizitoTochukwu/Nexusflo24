import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { ACTIVITY_TYPE_GROUPS, activityLabel } from "@/lib/crm/constants";
import { useCrmActivities } from "@/hooks/useCrmRecords";
import type { CrmRecordType } from "@/lib/crm/events";

type Props = {
  recordType: CrmRecordType;
  recordId: string;
  /** Restrict to a subset of activity types (used by the channel tabs). */
  limitToTypes?: string[];
  emptyLabel?: string;
};

const CrmTimeline = ({ recordType, recordId, limitToTypes, emptyLabel }: Props) => {
  const [group, setGroup] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const types = useMemo(() => {
    if (limitToTypes?.length) return limitToTypes;
    if (group === "all") return undefined;
    return ACTIVITY_TYPE_GROUPS.find((g) => g.label === group)?.types;
  }, [group, limitToTypes]);

  const { data = [], isLoading, isError, error } = useCrmActivities(recordType, recordId, {
    types,
    from: from || undefined,
    to: to || undefined,
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Couldn't load the timeline: {(error as any)?.message || "unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!limitToTypes && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px]">
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                {ACTIVITY_TYPE_GROUPS.map((g) => <SelectItem key={g.label} value={g.label}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" aria-label="To date" />
          {(from || to || group !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setGroup("all"); }}>Reset</Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Activity className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyLabel || "No activity recorded yet."}</p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {data.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
              <div className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{a.title || activityLabel(a.activity_type)}</span>
                  <Badge variant="secondary" className="text-[10px]">{activityLabel(a.activity_type)}</Badge>
                  {a.status && <Badge variant="outline" className="text-[10px]">{a.status}</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.occurred_at).toLocaleString()}
                  </span>
                </div>
                {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.actor_label || (a.actor_user_id ? "Team member" : "System")} · via {a.source}
                  {a.related_type ? ` · ${a.related_type}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default CrmTimeline;
