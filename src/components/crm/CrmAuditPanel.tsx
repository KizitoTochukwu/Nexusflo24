import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";

type AuditRow = {
  id: string;
  action: string;
  actor_user_id: string | null;
  actor_label: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

const HIDDEN_KEYS = new Set(["id", "workspace_id", "created_at", "updated_at", "created_by"]);

const pretty = (v: unknown) => {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!after) return [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => !HIDDEN_KEYS.has(k))
    .map((k) => ({ key: k, from: before?.[k], to: after[k] }))
    .filter((d) => pretty(d.from) !== pretty(d.to));
}

function useAuditTrail(workspaceId: string, recordId: string) {
  return useQuery({
    queryKey: ["crm-audit", workspaceId, recordId],
    enabled: !!workspaceId && !!recordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_audit_log" as any)
        .select("id,action,actor_user_id,actor_label,before_data,after_data,created_at")
        .eq("workspace_id", workspaceId)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
}

const CrmAuditPanel = ({ workspaceId, recordId }: { workspaceId: string; recordId: string }) => {
  const { data: rows = [], isLoading, isError, error } = useAuditTrail(workspaceId, recordId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const actorName = (row: AuditRow) => {
    if (row.actor_label) return row.actor_label;
    const m = (members as any[]).find((x) => x.user_id === row.actor_user_id);
    return m?.full_name || m?.email || (row.actor_user_id ? `${row.actor_user_id.slice(0, 8)}…` : "System");
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Could not load the audit trail: {(error as any)?.message || "unknown error"}
      </p>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <History className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No changes recorded yet</p>
        <p className="text-xs text-muted-foreground">Edits made to this record will be listed here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const changes = diff(row.before_data, row.after_data);
        return (
          <div key={row.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{row.action.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-medium">{actorName(row)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </div>
            {changes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {changes.map((c) => (
                  <li key={c.key} className="text-xs text-muted-foreground">
                    <span className="font-medium capitalize text-foreground">{c.key.replace(/_/g, " ")}</span>:{" "}
                    <span className="line-through">{pretty(c.from)}</span> → <span className="text-foreground">{pretty(c.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CrmAuditPanel;
