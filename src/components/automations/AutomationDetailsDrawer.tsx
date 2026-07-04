import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Play, Pause, CheckCircle2, XCircle, Clock, ArrowLeft, DoorOpen, FlaskConical, Filter, AlertTriangle, RotateCcw, Wallet, Mail, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  type Automation,
  TRIGGER_OPTIONS,
  useAutomationSteps,
  useAutomationLogs,
  useAutomationEmailDeliveries,
  useUpdateAutomation,
  useSimulateAutomation,
} from "@/hooks/useAutomations";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";
import ExecutionTimeline from "./ExecutionTimeline";
import ExecutionHistoryTable from "./ExecutionHistoryTable";
import SequenceHealthPanel from "./SequenceHealthPanel";
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
  const { data: emailDeliveries } = useAutomationEmailDeliveries(automation?.id ?? null, automation?.workspace_id ?? null);
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
  const [logsFilter, setLogsFilter] = useState<"all" | "exit" | "errors" | "email_issues">("all");
  const [activeTab, setActiveTab] = useState<string>("builder");
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
    <div className="fixed inset-y-0 right-0 left-[var(--dashboard-sidebar-width,0px)] z-[60] bg-background overflow-y-auto transition-[left] duration-300">
      {/* Top bar */}
      <div className="sticky top-0 z-[61] bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="builder">Workflow</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="logs">Logs ({logs?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 space-y-5 mt-6 mr-0">
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
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  placeholder="e.g. facebook-ads, qualified, meta-lead-ad"
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
                  {selectedFunnelId === "all" ? "Triggers for leads from any source" : "Fires when a new lead is associated with this funnel (via visit, form submission, or direct capture)"}
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
                <AutomationStepEditor
                  steps={steps}
                  onChange={setSteps}
                  triggerType={triggerType}
                  exitCriteria={exitCriteria}
                  onExitCriteriaChange={setExitCriteria}
                />
              )}
            </div>

          </TabsContent>

          <TabsContent value="timeline" className="mt-5 space-y-3">
            {logsLoading ? (
              <div className="rounded-lg border bg-card p-4 space-y-3" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn't load timeline</AlertTitle>
                <AlertDescription className="mt-1">
                  {(logsErrObj as Error)?.message || "Failed to load execution timeline."}
                </AlertDescription>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => refetchLogs()} disabled={logsFetching}>
                    <RotateCcw className={`mr-2 h-3.5 w-3.5 ${logsFetching ? "animate-spin" : ""}`} />
                    {logsFetching ? "Retrying…" : "Retry"}
                  </Button>
                </div>
              </Alert>
            ) : (
              <ExecutionTimeline
                logs={logs ?? []}
                leadLabelFor={(leadId) => {
                  if (!leadId) return "Unknown lead";
                  const lead = leads?.find((l) => l.id === leadId);
                  if (!lead) return `Lead ${leadId.slice(0, 8)}`;
                  return lead.full_name || lead.email || lead.phone || `Lead ${leadId.slice(0, 8)}`;
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-5 space-y-3">
            {logsLoading ? (
              <div className="rounded-lg border bg-card p-4 space-y-3" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}
              </div>
            ) : (
              <ExecutionHistoryTable
                automationId={automation.id}
                workspaceId={workspaceId}
                logs={logs ?? []}
                stepsCount={savedSteps?.filter((s) => !s.step_type.startsWith("branch_")).length ?? 0}
                leadLabelFor={(leadId) => {
                  if (!leadId) return "Unknown lead";
                  const lead = leads?.find((l) => l.id === leadId);
                  if (!lead) return `Lead ${leadId.slice(0, 8)}`;
                  return lead.full_name || lead.email || lead.phone || `Lead ${leadId.slice(0, 8)}`;
                }}
                onJumpToTimeline={() => setActiveTab("timeline")}
              />
            )}
          </TabsContent>


          <TabsContent value="health" className="mt-5 space-y-3">
            {automation && workspaceId ? (
              <SequenceHealthPanel automationId={automation.id} workspaceId={workspaceId} />
            ) : (
              <div className="text-sm text-muted-foreground">Workspace not loaded.</div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filter:</span>
              {([
                { v: "all", label: "All events" },
                { v: "exit", label: "Exit criteria" },
                { v: "errors", label: "Errors only" },
                { v: "email_issues", label: "Email issues" },
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
              const insufficientCreditChannels = Array.from(
                new Set(
                  (logs ?? [])
                    .filter((l) => l.status === "insufficient_credits")
                    .map((l) => (l.details as any)?.channel)
                    .filter(Boolean)
                )
              ) as string[];

              const filtered = (logs ?? []).filter((log) => {
                if (logsFilter === "exit") return log.event_type.startsWith("exit_criteria:");
                if (logsFilter === "errors")
                  return log.status === "failed" || log.status === "cancelled" || log.status === "insufficient_credits";
                if (logsFilter === "email_issues") {
                  if (log.event_type !== "action:send_email") return false;
                  if (log.status !== "success") return true;
                  if (!log.lead_id) return false;
                  const d = emailDeliveries?.get(log.lead_id);
                  return !d || d.status !== "sent" || !!d.error;
                }
                return true;
              });
              const creditBanner = insufficientCreditChannels.length > 0 ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Wallet className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-900">
                    Out of {insufficientCreditChannels.join(" & ")} credits
                  </AlertTitle>
                  <AlertDescription className="mt-1 text-amber-800">
                    Some {insufficientCreditChannels.join(" / ")} steps were skipped because the workspace has no credits left for that channel. Top up to resume sending — the automation will pick those steps up automatically on the next run.
                  </AlertDescription>
                  <div className="mt-3">
                    <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-100">
                      <Link to={`/dashboard/${workspaceId}/settings?tab=usage`}>
                        <Wallet className="mr-2 h-3.5 w-3.5" /> Top up credits
                      </Link>
                    </Button>
                  </div>
                </Alert>
              ) : null;

              if (!filtered.length) {
                return (
                  <>
                    {creditBanner}
                    <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                      {logsFilter === "all"
                        ? "No execution logs yet. Simulate or activate this automation to see logs."
                        : "No logs match this filter."}
                    </div>
                  </>
                );
              }
              return (
                <>
                  {creditBanner}
                  <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50/50 p-2 text-[11px] text-blue-900/80">
                    <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-700" />
                    <span>
                      <strong>Delivered to provider</strong> = Resend accepted the email. If a recipient says it didn't arrive, ask them to check spam — bounces and inbox placement happen after our hand-off. Use <strong>Send test</strong> in the email step editor to verify deliverability without waiting for a trigger.
                    </span>
                  </div>
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
                          const isInsufficient = log.status === "insufficient_credits";
                          const channel = (log.details as any)?.channel as string | undefined;
                          const isEmailAction = log.event_type === "action:send_email";
                          const delivery = isEmailAction && log.lead_id ? emailDeliveries?.get(log.lead_id) : undefined;
                          return (
                            <TableRow
                              key={log.id}
                              className={
                                isExit
                                  ? "bg-rose-50/40"
                                  : isInsufficient
                                    ? "bg-amber-50/50"
                                    : undefined
                              }
                            >
                              <TableCell className="font-medium text-sm">
                                <div className="flex items-center gap-1.5">
                                  {isExit && <DoorOpen className="h-3.5 w-3.5 text-rose-600" />}
                                  {isInsufficient && <Wallet className="h-3.5 w-3.5 text-amber-700" />}
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
                                ) : isInsufficient ? (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 gap-1">
                                    <Wallet className="h-3 w-3" /> Out of {channel || "credits"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                                    <XCircle className="h-3 w-3" /> Failed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[320px]">
                                {isEmailAction ? (
                                  <div className="space-y-1">
                                    {delivery ? (
                                      delivery.status === "sent" ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                                            <Mail className="h-3 w-3" /> Delivered to provider
                                          </Badge>
                                          <span className="text-foreground/80 truncate max-w-[200px]" title={delivery.to_email}>
                                            {delivery.to_email}
                                          </span>
                                          {delivery.provider_message_id && (
                                            <button
                                              type="button"
                                              className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(delivery.provider_message_id!);
                                                toast.success("Message ID copied");
                                              }}
                                              title={delivery.provider_message_id}
                                            >
                                              <Copy className="h-2.5 w-2.5" />
                                              {delivery.provider_message_id.slice(0, 8)}…
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 text-[10px]">
                                            <XCircle className="h-3 w-3" /> Delivery failed
                                          </Badge>
                                          <span className="text-red-700/90 truncate max-w-[220px]" title={delivery.error || ""}>
                                            {delivery.error || "Provider rejected the email."}
                                          </span>
                                        </div>
                                      )
                                    ) : (
                                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[10px]">
                                        <Clock className="h-3 w-3" /> Awaiting provider log
                                      </Badge>
                                    )}
                                  </div>
                                ) : isInsufficient ? (
                                  <span className="block truncate">
                                    {(log.details as any)?.message || `Out of ${channel || "channel"} credits — top up to resume.`}
                                  </span>
                                ) : (
                                  <span className="block truncate">{JSON.stringify(log.details)}</span>
                                )}
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
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
