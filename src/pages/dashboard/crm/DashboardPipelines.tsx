import { useState } from "react";
import { GitBranch, Plus, Settings2, Trash2 } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { usePipelines, usePipelineStages, useSavePipeline, useDeletePipeline, type Pipeline } from "@/hooks/useDeals";
import PipelineManagerDialog from "@/components/crm/PipelineManagerDialog";

const PipelineCard = ({ pipeline, canManage }: { pipeline: Pipeline; canManage: boolean }) => {
  const workspaceId = useWorkspaceId();
  const { data: stages = [] } = usePipelineStages(pipeline.id);
  const deletePipeline = useDeletePipeline();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{pipeline.name}</h2>
            <p className="text-sm text-muted-foreground">{stages.length} stages</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                <Settings2 className="h-4 w-4" /> Manage
              </Button>
              {!pipeline.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {stages.length === 0 && <p className="text-sm text-muted-foreground">No stages yet.</p>}
          {stages.map((s) => (
            <Badge key={s.id} variant="outline" className="gap-1.5">
              {s.name}
              <span className="text-muted-foreground">{s.probability}%</span>
            </Badge>
          ))}
        </div>
      </CardContent>

      {open && (
        <PipelineManagerDialog
          open={open}
          onOpenChange={setOpen}
          workspaceId={workspaceId}
          pipeline={pipeline}
          stages={stages}
        />
      )}
    </Card>
  );
};

const DashboardPipelines = () => {
  const workspaceId = useWorkspaceId();
  const { canManage } = useWorkspaceRole();
  const { data: pipelines = [], isLoading } = usePipelines(workspaceId);
  const savePipeline = useSavePipeline();

  return (
    <div className="space-y-6">
      <Seo title="Pipelines | NexusFlo24 CRM" description="Create and shape the sales pipelines and stages your deals move through." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pipelines</h1>
            <p className="text-sm text-muted-foreground">Stages, win probabilities and outcomes for your deals.</p>
          </div>
        </div>
        {canManage && (
          <Button
            className="gap-1.5"
            disabled={savePipeline.isPending}
            onClick={() => savePipeline.mutate({ workspace_id: workspaceId, name: "New pipeline" })}
          >
            <Plus className="h-4 w-4" /> New pipeline
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipelines…</p>
      ) : pipelines.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No pipelines yet. Create one to start tracking deals.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pipelines.map((p) => (
            <PipelineCard key={p.id} pipeline={p} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPipelines;
