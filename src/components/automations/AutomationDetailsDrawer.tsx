import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Play, Pause, CheckCircle2, XCircle, Clock, ArrowLeft, DoorOpen, FlaskConical, Filter, AlertTriangle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  type Automation,
  TRIGGER_OPTIONS,
  useAutomationSteps,
  useAutomationLogs,
  useUpdateAutomation,
  useSimulateAutomation,
} from "@/hooks/useAutomations";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";
import ExitCriteriaEditor from "./ExitCriteriaEditor";
import {
  getDefaultExitCriteria,
  describeCriterion,
  simulateExitEvent,
  type ExitCriterion,
} from "@/lib/automations/exitCriteria";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useFunnels } from "@/hooks/useFunnels";
import { useLeadFolders } from "@/hooks/useLeadFolders";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  automation: Automation | null;
  open: boolean;
  onClose: () => void;
}

export default function AutomationDetailsDrawer({ automation, open, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: savedSteps, isLoading: stepsLoading, isError: stepsError, error: stepsErr, refetch: refetchSteps } = useAutomationSteps(automation?.id ?? null);
  const { data: logs, isLoading: logsLoading, isError: logsError, error: logsErrObj, refetch: refetchLogs, isFetching: logsFetching } = useAutomationLogs(automation?.id ?? null);
  const { data: funnels } = useFunnels(workspaceId);
  const { data: folders } = useLeadFolders(workspaceId);
  const updateAutomation = useUpdateAutomation();
  const simulate = useSimulateAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("new_lead");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("any");
  const [tagValue, setTagValue] = useState<string>("");
  const [steps, setSteps] = useState<StepData[]>([]);
  const [exitCriteria, setExitCriteria] = useState<ExitCriterion[]>([]);
  const [testLeadId, setTestLeadId] = useState<string>("");
  const [testCriterionIdx, setTestCriterionIdx] = useState<string>("0");
  const [testRunning, setTestRunning] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"all" | "exit" | "errors">("all");
  const { data: leads } = useLeads(workspaceId);
  const qc = useQueryClient();

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setDescription(automation.description || "");
      setTriggerType(automation.trigger_type);
      const cfg = (automation.trigger_config ?? {}) as Record<string, unknown>;
      setSelectedFunnelId((cfg.funnel_id as string) || "all");
      setSelectedFolderId((cfg.folder_id as string) || "any");
      setTagValue((cfg.tag as string) || "");
      // Pre-fill sensible defaults for legacy automations that have never set exit_criteria.
      const saved = (automation.exit_criteria ?? []) as ExitCriterion[];
      if (saved.length === 0) {
        setExitCriteria(getDefaultExitCriteria(automation.trigger_type));
      } else {
        setExitCriteria(saved);
      }
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
    if (triggerType === "lead_added_to_folder") {
      if (selectedFolderId !== "any") triggerConfig.folder_id = selectedFolderId;
    } else if (triggerType === "lead_tagged") {
      if (tagValue.trim()) triggerConfig.tag = tagValue.trim();
    } else if (selectedFunnelId !== "all") {
      triggerConfig.funnel_id = selectedFunnelId;
    }
    updateAutomation.mutate({
      id: automation.id,
      workspace_id: workspaceId,
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      exit_criteria: exitCriteria,
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
      <div className="sticky top-0 z-[61] bg-background border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
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

            {triggerType === "lead_added_to_folder" ? (
              <div>
                <label className="text-sm font-medium text-foreground">Scope to folder</label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Any folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any folder</SelectItem>
                    {(folders ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Fires when a lead is added to this folder (manual move, CSV import, or auto-routing).
                </p>
              </div>
            ) : triggerType === "lead_tagged" ? (
              <div>
                <label className="text-sm font-medium text-foreground">Tag</label>
                <Input
                  className="max-w-sm"
                  placeholder="e.g. csv-march-2026"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fires whenever this exact tag is added. Leave blank to match any tag.
                </p>
              </div>
            ) : (
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
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Steps</label>
              {stepsLoading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading steps">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : stepsError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn't load saved steps</AlertTitle>
                  <AlertDescription className="mt-1">
                    {(stepsErr as Error)?.message || "We couldn't load this automation's steps. You can retry, or continue editing — note that retrying will replace any unsaved changes."}
                  </AlertDescription>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => refetchSteps()}>
                      <RotateCcw className="mr-2 h-3.5 w-3.5" /> Retry
                    </Button>
                  </div>
                </Alert>
              ) : (
                <AutomationStepEditor steps={steps} onChange={setSteps} triggerType={triggerType} />
              )}
            </div>

            <ExitCriteriaEditor
              value={exitCriteria}
              onChange={setExitCriteria}
              triggerType={triggerType}
            />

            {/* Test exit criteria panel */}
            {exitCriteria.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-background p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-rose-600" />
                  <span className="text-sm font-semibold">Verify exit criteria</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pick a test lead and a configured exit rule. We'll write the matching event and run the same cancellation sweep your live triggers use, then report how many pending steps were cancelled.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={testLeadId} onValueChange={setTestLeadId}>
                    <SelectTrigger className="h-8 w-[220px] text-xs">
                      <SelectValue placeholder="Select a test lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {(leads ?? []).slice(0, 100).map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_name || l.email || l.phone || l.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={testCriterionIdx} onValueChange={setTestCriterionIdx}>
                    <SelectTrigger className="h-8 w-[220px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {exitCriteria.map((c, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {describeCriterion(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!testLeadId || testRunning}
                    className="h-8 gap-1.5"
                    onClick={async () => {
                      const idx = parseInt(testCriterionIdx, 10) || 0;
                      const criterion = exitCriteria[idx];
                      if (!criterion || !testLeadId) return;
                      setTestRunning(true);
                      try {
                        const res = await simulateExitEvent({
                          workspaceId,
                          leadId: testLeadId,
                          criterion,
                        });
                        if (res.cancelledCount > 0) {
                          toast.success(
                            `Exit fired — ${res.cancelledCount} pending step${res.cancelledCount === 1 ? "" : "s"} cancelled (event: ${res.eventType})`
                          );
                        } else {
                          toast.info(
                            `Event "${res.eventType}" fired — no pending steps for this lead, but the log was written. Check Logs tab.`
                          );
                        }
                        qc.invalidateQueries({ queryKey: ["automation-logs", automation.id] });
                        qc.invalidateQueries({ queryKey: ["workspace-exited-counts", workspaceId] });
                      } catch (e: any) {
                        toast.error(e?.message || "Test failed");
                      } finally {
                        setTestRunning(false);
                      }
                    }}
                  >
                    {testRunning ? "Testing…" : "Test exit now"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Note: this writes a real event (e.g. adds the "unsubscribed" tag, inserts a purchase activity). Use a test lead.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-5 space-y-3">
            {/* Filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filter:</span>
              {([
                { v: "all", label: "All events" },
                { v: "exit", label: "Exit criteria" },
                { v: "errors", label: "Errors only" },
              ] as const).map((f) => (
                <Button
                  key={f.v}
                  type="button"
                  size="sm"
                  variant={logsFilter === f.v ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setLogsFilter(f.v)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {logsLoading ? (
              <div className="rounded-lg border bg-card p-4 space-y-3" aria-busy="true" aria-label="Loading logs">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : logsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn't load logs</AlertTitle>
                <AlertDescription className="mt-1">
                  {(logsErrObj as Error)?.message || "Failed to load execution logs."}
                </AlertDescription>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => refetchLogs()} disabled={logsFetching}>
                    <RotateCcw className={`mr-2 h-3.5 w-3.5 ${logsFetching ? "animate-spin" : ""}`} />
                    {logsFetching ? "Retrying…" : "Retry"}
                  </Button>
                </div>
              </Alert>
            ) : (() => {
              const filtered = (logs ?? []).filter((log) => {
                if (logsFilter === "exit") return log.event_type.startsWith("exit_criteria:");
                if (logsFilter === "errors") return log.status === "failed" || log.status === "cancelled";
                return true;
              });
              if (!filtered.length) {
                return (
                  <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                    {logsFilter === "all"
                      ? "No execution logs yet. Simulate or activate this automation to see logs."
                      : "No logs match this filter."}
                  </div>
                );
              }
              return (
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
                      {filtered.map((log) => {
                        const isExit = log.event_type.startsWith("exit_criteria:");
                        return (
                          <TableRow key={log.id} className={isExit ? "bg-rose-50/40" : undefined}>
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-1.5">
                                {isExit && <DoorOpen className="h-3.5 w-3.5 text-rose-600" />}
                                {log.event_type}
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.status === "success" ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Success
                                </Badge>
                              ) : log.status === "scheduled" ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                  <Clock className="h-3 w-3" /> Scheduled
                                </Badge>
                              ) : log.status === "skipped" || log.status === "condition_failed" ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                  <Clock className="h-3 w-3" /> {log.status === "condition_failed" ? "Condition Failed" : "Skipped"}
                                </Badge>
                              ) : log.status === "completed" ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Completed
                                </Badge>
                              ) : log.status === "cancelled" ? (
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
                                  <DoorOpen className="h-3 w-3" /> Exited
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
