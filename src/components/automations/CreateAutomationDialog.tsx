import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateAutomation } from "@/hooks/useAutomations";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";
import { getDefaultExitCriteria, type ExitCriterion } from "@/lib/automations/exitCriteria";
import EnrollmentTriggerCard, {
  type EnrollmentTriggerRecord,
} from "@/components/workflows/EnrollmentTriggerCard";
import { ENROLLMENT_OBJECTS, type EnrollmentObject } from "@/lib/workflows/triggerCatalog";

export default function CreateAutomationDialog() {
  const [open, setOpen] = useState(false);
  const workspaceId = useWorkspaceId();
  const createAutomation = useCreateAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentObject, setEnrollmentObject] = useState<EnrollmentObject>("lead");
  const [trigger, setTrigger] = useState<EnrollmentTriggerRecord>({
    workspace_id: workspaceId,
    enrollment_object_type: "lead",
    enrollment_method: "event",
    trigger_source: null,
    trigger_event: null,
    trigger_config: {},
    filter_groups: [],
    reenrollment_config: { mode: "never" },
    trigger_summary: null,
  });
  const [steps, setSteps] = useState<StepData[]>([]);
  const [exitCriteria, setExitCriteria] = useState<ExitCriterion[]>([]);

  const reset = () => {
    setName("");
    setDescription("");
    setEnrollmentObject("lead");
    setTrigger({
      workspace_id: workspaceId,
      enrollment_object_type: "lead",
      enrollment_method: "event",
      trigger_source: null,
      trigger_event: null,
      trigger_config: {},
      filter_groups: [],
      reenrollment_config: { mode: "never" },
      trigger_summary: null,
    });
    setSteps([]);
    setExitCriteria([]);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    // Legacy trigger_type is kept in sync with trigger_event so runtime
    // executors (fireTriggers, execute-automation, folder trigger) keep working.
    const triggerType = trigger.trigger_event || "new_lead";
    const effectiveExit = exitCriteria.length ? exitCriteria : getDefaultExitCriteria(triggerType);
    createAutomation.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: (trigger.trigger_config as Record<string, unknown>) || {},
        exit_criteria: effectiveExit,
        steps,
        enrollment_object_type: enrollmentObject,
        enrollment_method: trigger.enrollment_method || "event",
        trigger_source: trigger.trigger_source ?? null,
        trigger_event: trigger.trigger_event ?? null,
        filter_groups: (trigger.filter_groups as unknown[]) || [],
        reenrollment_config: trigger.reenrollment_config || { mode: "never" },
        trigger_summary: trigger.trigger_summary ?? null,
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
            <label className="text-sm font-medium text-foreground">Enrollment object</label>
            <Select
              value={enrollmentObject}
              onValueChange={(v) => {
                const next = v as EnrollmentObject;
                setEnrollmentObject(next);
                // Reset source/event because available sources depend on the object.
                setTrigger((t) => ({
                  ...t,
                  enrollment_object_type: next,
                  trigger_source: null,
                  trigger_event: null,
                  trigger_config: {},
                }));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENROLLMENT_OBJECTS.filter((o) => o.supported).map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Controls which records can enter this automation. Leads and contacts are supported today.
            </p>
          </div>

          <EnrollmentTriggerCard
            record={trigger}
            enrollmentObject={enrollmentObject}
            recordKind="automation"
            onChange={async (patch) => {
              setTrigger((t) => ({
                ...t,
                enrollment_method: patch.enrollment_method,
                trigger_source: patch.trigger_source,
                trigger_event: patch.trigger_event,
                trigger_config: patch.trigger_config,
                filter_groups: patch.filter_groups,
                reenrollment_config: patch.reenrollment_config,
                trigger_summary: patch.trigger_summary,
              }));
            }}
          />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Workflow Steps</label>
            <AutomationStepEditor
              steps={steps}
              onChange={setSteps}
              triggerType={trigger.trigger_event || "new_lead"}
            />
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
