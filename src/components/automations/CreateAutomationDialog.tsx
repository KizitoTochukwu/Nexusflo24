import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateAutomation, TRIGGER_OPTIONS } from "@/hooks/useAutomations";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useFunnels } from "@/hooks/useFunnels";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";

export default function CreateAutomationDialog() {
  const [open, setOpen] = useState(false);
  const workspaceId = useWorkspaceId();
  const createAutomation = useCreateAutomation();
  const { data: funnels } = useFunnels(workspaceId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("new_lead");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [steps, setSteps] = useState<StepData[]>([]);

  const reset = () => {
    setName("");
    setDescription("");
    setTriggerType("new_lead");
    setSelectedFunnelId("all");
    setSteps([]);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const triggerConfig: Record<string, unknown> = {};
    if (triggerType === "new_lead" && selectedFunnelId !== "all") {
      triggerConfig.funnel_id = selectedFunnelId;
    }
    createAutomation.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Automation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Automation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input placeholder="e.g. Welcome new leads" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea placeholder="What does this automation do?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Trigger</label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Workflow Steps</label>
            <AutomationStepEditor steps={steps} onChange={setSteps} triggerType={triggerType} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createAutomation.isPending}>
            {createAutomation.isPending ? "Creating…" : "Create Automation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
