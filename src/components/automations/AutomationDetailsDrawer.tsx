import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Play, Pause, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import {
  type Automation,
  TRIGGER_OPTIONS,
  useAutomationSteps,
  useAutomationLogs,
  useUpdateAutomation,
  useSimulateAutomation,
} from "@/hooks/useAutomations";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useFunnels } from "@/hooks/useFunnels";
import { format } from "date-fns";

interface Props {
  automation: Automation | null;
  open: boolean;
  onClose: () => void;
}

export default function AutomationDetailsDrawer({ automation, open, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: savedSteps } = useAutomationSteps(automation?.id ?? null);
  const { data: logs } = useAutomationLogs(automation?.id ?? null);
  const { data: funnels } = useFunnels(workspaceId);
  const updateAutomation = useUpdateAutomation();
  const simulate = useSimulateAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("new_lead");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [steps, setSteps] = useState<StepData[]>([]);

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setDescription(automation.description || "");
      setTriggerType(automation.trigger_type);
      const fId = (automation.trigger_config as Record<string, unknown>)?.funnel_id as string | undefined;
      setSelectedFunnelId(fId || "all");
    }
  }, [automation]);

  useEffect(() => {
    if (savedSteps) {
      setSteps(savedSteps.map((s) => ({ step_type: s.step_type as StepData["step_type"], config: s.config as Record<string, unknown> })));
    }
  }, [savedSteps]);

  if (!automation || !open) return null;

  const handleSave = () => {
    const triggerConfig: Record<string, unknown> = {};
    if (selectedFunnelId !== "all") {
      triggerConfig.funnel_id = selectedFunnelId;
    }
    updateAutomation.mutate({
      id: automation.id,
      workspace_id: workspaceId,
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps,
    });
  };

  const toggleStatus = () => {
    const newStatus = automation.status === "active" ? "paused" : "active";
    updateAutomation.mutate({ id: automation.id, workspace_id: workspaceId, status: newStatus });
  };

  const handleSimulate = () => {
    simulate.mutate({ automationId: automation.id, workspaceId });
  };

  const statusColor = automation.status === "active" ? "bg-emerald-100 text-emerald-700" : automation.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Zap className="h-5 w-5 text-accent shrink-0" />
        <h1 className="text-lg font-semibold truncate flex-1">{automation.name}</h1>
        <Badge className={statusColor}>{automation.status}</Badge>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleStatus} className="gap-1.5">
            {automation.status === "active" ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Activate</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSimulate} disabled={simulate.isPending} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> {simulate.isPending ? "Running…" : "Simulate"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateAutomation.isPending}>
            {updateAutomation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="builder">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="builder">Workflow</TabsTrigger>
            <TabsTrigger value="logs">Logs ({logs?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-5 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
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
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Scope to funnel (optional)</label>
              <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="All funnels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All funnels (global)</SelectItem>
                  {(funnels ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFunnelId === "all" ? "Triggers for leads from any source" : "Only triggers for leads from this funnel"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Steps</label>
              <AutomationStepEditor steps={steps} onChange={setSteps} triggerType={triggerType} />
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-5">
            {!logs?.length ? (
              <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                No execution logs yet. Simulate or activate this automation to see logs.
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-sm">{log.event_type}</TableCell>
                        <TableCell>
                          {log.status === "success" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Success
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {JSON.stringify(log.details)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "MMM d, HH:mm")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
