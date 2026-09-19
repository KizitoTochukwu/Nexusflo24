// Real record pickers for enrollment trigger scope fields.
//
// Scope values are stored as { id, label } so the engine can match on the ID
// while the UI keeps showing a human name. Free text is no longer accepted for
// fields that point at a real record — that was the cause of scoped triggers
// silently never matching.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { ScopeFieldKey } from "@/lib/workflows/triggerCatalog";

export interface ScopeValue { id: string; label: string }

export const ANY = "__any__";

/** Scope keys that resolve to a real record we can list. */
const PICKABLE: ScopeFieldKey[] = [
  "pipeline", "stage", "owner", "lead_source", "tags", "form_id",
  "funnel_id", "funnel_step_id", "calendar_id", "booking_type",
  "assigned_user", "campaign_id", "store_id", "shop_product_id",
];

export function isPickable(key: string): boolean {
  return PICKABLE.includes(key as ScopeFieldKey);
}

async function loadOptions(
  key: string,
  workspaceId: string,
  pipelineId?: string | null,
): Promise<ScopeValue[]> {
  const rows = async (table: string, extra?: (q: any) => any) => {
    let q = supabase.from(table as any).select("id,name").eq("workspace_id", workspaceId);
    if (extra) q = extra(q);
    const { data } = await q.order("name");
    return ((data as any[]) || []).map((r) => ({ id: String(r.id), label: r.name || "Untitled" }));
  };

  switch (key) {
    case "pipeline":
      return rows("crm_pipelines");
    case "stage":
      return rows("crm_pipeline_stages", (q: any) =>
        pipelineId && pipelineId !== ANY ? q.eq("pipeline_id", pipelineId) : q);
    case "tags":
      return rows("crm_tags");
    case "form_id":
      return rows("forms");
    case "funnel_id":
      return rows("funnels");
    case "calendar_id":
      return rows("booking_pages");
    case "booking_type":
      return rows("appointment_types");
    case "campaign_id":
      return rows("campaigns");
    case "store_id":
      return rows("shop_stores");
    case "shop_product_id":
      return rows("shop_products");
    case "funnel_step_id": {
      const { data } = await supabase
        .from("funnel_steps")
        .select("id,step_order,step_type")
        .eq("workspace_id", workspaceId)
        .order("step_order");
      return ((data as any[]) || []).map((r) => ({
        id: String(r.id),
        label: `Step ${r.step_order} · ${r.step_type}`,
      }));
    }
    case "lead_source": {
      const { data } = await supabase
        .from("leads")
        .select("source")
        .eq("workspace_id", workspaceId)
        .not("source", "is", null)
        .limit(1000);
      const uniq = Array.from(new Set(((data as any[]) || []).map((r) => r.source).filter(Boolean)));
      return uniq.sort().map((s: string) => ({ id: s, label: s }));
    }
    case "owner":
    case "assigned_user": {
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId);
      const ids = ((members as any[]) || []).map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", ids);
      return ((profiles as any[]) || []).map((p) => ({
        id: String(p.id),
        label: p.full_name || p.email || "Team member",
      }));
    }
    default:
      return [];
  }
}

interface Props {
  scopeKey: string;
  label: string;
  workspaceId?: string | null;
  value: ScopeValue | string | null | undefined;
  allowAny?: boolean;
  /** Current pipeline scope, used to narrow the stage list. */
  pipelineId?: string | null;
  onChange: (v: ScopeValue | string | null) => void;
}

export default function ScopeValuePicker({
  scopeKey, label, workspaceId, value, allowAny, pipelineId, onChange,
}: Props) {
  const pickable = isPickable(scopeKey) && !!workspaceId;

  const { data: options, isLoading } = useQuery({
    queryKey: ["scope-options", scopeKey, workspaceId, pipelineId],
    queryFn: () => loadOptions(scopeKey, workspaceId as string, pipelineId),
    enabled: pickable,
    staleTime: 60_000,
  });

  if (!pickable) {
    const text = typeof value === "object" && value ? value.label : (value === ANY ? "" : (value ?? ""));
    return (
      <Input
        value={String(text ?? "")}
        placeholder={allowAny ? "Any value" : `Enter ${label.toLowerCase()}`}
        onChange={(e) => onChange(e.target.value || (allowAny ? ANY : null))}
        className="h-8"
      />
    );
  }

  const selected = typeof value === "object" && value ? value.id : (typeof value === "string" ? value : ANY);

  return (
    <Select
      value={selected || ANY}
      onValueChange={(v) => {
        if (v === ANY) return onChange(ANY);
        const opt = (options || []).find((o) => o.id === v);
        onChange(opt ? { id: opt.id, label: opt.label } : v);
      }}
    >
      <SelectTrigger className="h-8">
        <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent className="z-[61] max-h-72">
        {allowAny !== false && <SelectItem value={ANY}>Any value</SelectItem>}
        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        )}
        {(options || []).map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
        ))}
        {!isLoading && (options || []).length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Nothing to choose from yet</div>
        )}
      </SelectContent>
    </Select>
  );
}
