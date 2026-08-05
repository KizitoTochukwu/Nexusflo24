import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { formatMoney, useUpdateDeal, type Deal, type PipelineStage } from "@/hooks/useDeals";

type Props = {
  stages: PipelineStage[];
  deals: Deal[];
  isLoading?: boolean;
  canEdit: boolean;
  onSelect: (deal: Deal) => void;
  onAdd: (stageId: string) => void;
};

const DealsBoard = ({ stages, deals, isLoading, canEdit, onSelect, onAdd }: Props) => {
  const update = useUpdateDeal();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    stages.forEach((s) => map.set(s.id, []));
    deals.forEach((d) => {
      if (d.stage_id && map.has(d.stage_id)) map.get(d.stage_id)!.push(d);
    });
    return map;
  }, [stages, deals]);

  const drop = (stage: PipelineStage) => {
    setOverStage(null);
    const deal = deals.find((d) => d.id === dragId);
    setDragId(null);
    if (!deal || !canEdit || deal.stage_id === stage.id) return;
    update.mutate({
      id: deal.id,
      prev: deal,
      silent: true,
      stage_id: stage.id,
      probability: stage.probability,
      status: stage.stage_type === "won" ? "won" : stage.stage_type === "lost" ? "lost" : "open",
      closed_at: stage.stage_type === "open" ? null : new Date().toISOString(),
    } as any);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const items = byStage.get(stage.id) ?? [];
        const total = items.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        const currency = items[0]?.currency ?? "USD";
        return (
          <div
            key={stage.id}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
            onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => drop(stage)}
            className={`w-72 shrink-0 rounded-xl border bg-muted/30 p-3 transition-colors ${
              overStage === stage.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "hsl(var(--primary))" }} />
                <span className="text-sm font-semibold">{stage.name}</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{items.length}</Badge>
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Add deal to ${stage.name}`} onClick={() => onAdd(stage.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{formatMoney(total, currency)} · {stage.probability}% win</p>

            <div className="space-y-2">
              {items.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  draggable={canEdit}
                  onDragStart={() => setDragId(deal.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onSelect(deal)}
                  className={`w-full rounded-lg border border-border bg-background p-3 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md ${
                    dragId === deal.id ? "opacity-50" : ""
                  }`}
                >
                  <p className="truncate text-sm font-medium">{deal.name}</p>
                  <p className="mt-1 text-sm font-semibold text-primary">{formatMoney(deal.amount, deal.currency)}</p>
                  {deal.expected_close_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Closes {new Date(deal.expected_close_date).toLocaleDateString()}
                    </p>
                  )}
                </button>
              ))}
              {!items.length && (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Drop deals here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DealsBoard;
