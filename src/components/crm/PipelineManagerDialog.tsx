import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useDeleteStage, useSavePipeline, useSaveStage,
  type Pipeline, type PipelineStage,
} from "@/hooks/useDeals";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  pipeline?: Pipeline;
  stages: PipelineStage[];
};

const STAGE_TYPES = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const PipelineManagerDialog = ({ open, onOpenChange, workspaceId, pipeline, stages }: Props) => {
  const savePipeline = useSavePipeline();
  const saveStage = useSaveStage();
  const deleteStage = useDeleteStage();

  const [name, setName] = useState(pipeline?.name ?? "");
  const [newStage, setNewStage] = useState("");

  const addStage = async () => {
    if (!newStage.trim() || !pipeline) return;
    await saveStage.mutateAsync({
      workspace_id: workspaceId,
      pipeline_id: pipeline.id,
      name: newStage.trim(),
      position: stages.length,
      probability: 50,
      stage_type: "open",
    });
    setNewStage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline settings</DialogTitle>
          <DialogDescription>Rename the pipeline and shape its stages.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pipeline-name">Pipeline name</Label>
            <div className="flex gap-2">
              <Input
                id="pipeline-name"
                value={name || pipeline?.name || ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sales Pipeline"
              />
              <Button
                variant="outline"
                disabled={!pipeline || savePipeline.isPending}
                onClick={() => pipeline && savePipeline.mutate({ id: pipeline.id, workspace_id: workspaceId, name: name || pipeline.name })}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Stages</Label>
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <Input
                  className="flex-1"
                  defaultValue={stage.name}
                  aria-label={`${stage.name} name`}
                  onBlur={(e) =>
                    e.target.value !== stage.name &&
                    saveStage.mutate({ id: stage.id, workspace_id: workspaceId, pipeline_id: stage.pipeline_id, name: e.target.value })
                  }
                />
                <Input
                  className="w-20"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={stage.probability}
                  aria-label={`${stage.name} win probability`}
                  onBlur={(e) =>
                    saveStage.mutate({
                      id: stage.id, workspace_id: workspaceId, pipeline_id: stage.pipeline_id,
                      name: stage.name, probability: Number(e.target.value) || 0,
                    })
                  }
                />
                <Select
                  value={stage.stage_type}
                  onValueChange={(v) =>
                    saveStage.mutate({
                      id: stage.id, workspace_id: workspaceId, pipeline_id: stage.pipeline_id,
                      name: stage.name, stage_type: v,
                    })
                  }
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Delete ${stage.name}`}
                  onClick={() => deleteStage.mutate(stage.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="New stage name" />
              <Button variant="outline" onClick={addStage} disabled={!newStage.trim() || saveStage.isPending}>
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineManagerDialog;
