import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PIPELINE_STAGES, type Lead, type PipelineStage } from "@/hooks/useLeads";
import { useUpdateLead } from "@/hooks/useLeads";
import { Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  workspaceId: string;
};

const PipelineView = ({ leads, onLeadClick, workspaceId }: Props) => {
  const updateLead = useUpdateLead();

  const stageGroups = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.pipeline_stage === stage.value),
  }));

  const moveStage = (lead: Lead, direction: "next" | "prev") => {
    const currentIdx = PIPELINE_STAGES.findIndex((s) => s.value === lead.pipeline_stage);
    const newIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= PIPELINE_STAGES.length) return;
    updateLead.mutate({
      id: lead.id,
      pipeline_stage: PIPELINE_STAGES[newIdx].value as PipelineStage,
      workspace_id: workspaceId,
      prev: {},
    });
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {stageGroups.map((stage) => (
          <div key={stage.value} className="w-72 shrink-0">
            <div className={`rounded-t-lg px-3 py-2 ${stage.color} flex items-center justify-between`}>
              <span className="text-xs font-semibold">{stage.label}</span>
              <Badge variant="secondary" className="text-[10px] h-5">
                {stage.leads.length}
              </Badge>
            </div>
            <div className="rounded-b-lg border border-t-0 bg-card p-2 space-y-2 min-h-[120px]">
              {stage.leads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
              )}
              {stage.leads.map((lead) => {
                const stageIdx = PIPELINE_STAGES.findIndex((s) => s.value === lead.pipeline_stage);
                return (
                  <Card
                    key={lead.id}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: lead.score >= 80 ? "hsl(var(--accent))" : "transparent" }}
                    onClick={() => onLeadClick(lead)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{lead.full_name || lead.email || "Unknown"}</p>
                        {lead.email && lead.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <span className={`text-xs font-bold ${lead.score >= 80 ? "text-accent" : "text-muted-foreground"}`}>
                          {lead.score}
                        </span>
                        {(lead as any).ai_qualification?.verdict && (
                          <Sparkles className="h-3 w-3 text-accent" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {lead.tags?.slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] h-4 px-1">{t}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          disabled={stageIdx === 0}
                          onClick={() => moveStage(lead, "prev")}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          disabled={stageIdx === PIPELINE_STAGES.length - 1}
                          onClick={() => moveStage(lead, "next")}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default PipelineView;
