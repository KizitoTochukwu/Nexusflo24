import { useMemo, useState } from "react";
import { useWorkflowDiagnostics, useTestEnrollWorkflow, useLeadSearch, useResumeEnrollment } from "@/hooks/useWorkflows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilterX,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  Search as SearchIcon,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { WorkflowCanvasJSON } from "@/lib/workflows/types";

interface Props {
  workflowId: string;
  workspaceId: string;
  workflowStatus: string;
  canvas: WorkflowCanvasJSON;
  onClose: () => void;
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-emerald-500",
    completed: "bg-emerald-500",
    active: "bg-blue-500",
    failed: "bg-destructive",
    exited: "bg-amber-500",
    skipped: "bg-muted-foreground",
    pending: "bg-amber-500",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status] || "bg-muted-foreground"}`} />;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "due now";
  if (ms < 60_000) return `in ${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `in ${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `in ${Math.round(ms / 3_600_000)}h`;
  return `in ${Math.round(ms / 86_400_000)}d`;
}

export default function DiagnosticsPanel({ workflowId, workspaceId, workflowStatus, canvas, onClose }: Props) {
  const { data, isLoading, refetch, isRefetching } = useWorkflowDiagnostics(workflowId);
  const [search, setSearch] = useState("");
  const { data: leads = [] } = useLeadSearch(workspaceId, search);
  const testEnroll = useTestEnrollWorkflow();

  const nodeLabel = (nodeId: string): string => {
    const n = (canvas.nodes || []).find((x) => x.id === nodeId);
    return (n?.data as any)?.label || (n?.data as any)?.subType || nodeId.slice(0, 8);
  };

  // ---- Filters (apply to logs / runs / scheduled) ----
  const [filterText, setFilterText] = useState(""); // free text (matches lead_id, message, error)
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [filterNodeId, setFilterNodeId] = useState<string>("all");
  const [filterLeadId, setFilterLeadId] = useState<string>("");
  const [filterRange, setFilterRange] = useState<"1h" | "24h" | "7d" | "all">("24h");

  const rangeMs: Record<string, number | null> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    all: null,
  };
  const rangeCutoff = rangeMs[filterRange] ? Date.now() - (rangeMs[filterRange] as number) : 0;

  const eventTypeOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.logs || []).forEach((l: any) => l.event_type && set.add(l.event_type));
    return Array.from(set).sort();
  }, [data?.logs]);

  const nodeOptions = useMemo(() => {
    return (canvas.nodes || []).map((n) => ({
      id: n.id,
      label: (n.data as any)?.label || (n.data as any)?.subType || n.id.slice(0, 8),
    }));
  }, [canvas.nodes]);

  const text = filterText.trim().toLowerCase();
  const lead = filterLeadId.trim().toLowerCase();

  const matchesTime = (iso?: string) =>
    !iso || !rangeCutoff || new Date(iso).getTime() >= rangeCutoff;
  const matchesLead = (id?: string) => !lead || (id || "").toLowerCase().includes(lead);
  const matchesNode = (nid?: string) => filterNodeId === "all" || nid === filterNodeId;

  const filteredLogs = useMemo(
    () =>
      (data?.logs || []).filter((l: any) => {
        if (!matchesTime(l.created_at)) return false;
        if (filterEventType !== "all" && l.event_type !== filterEventType) return false;
        if (!matchesLead(l.lead_id)) return false;
        if (text) {
          const hay = `${l.event_type || ""} ${l.message || ""} ${l.lead_id || ""}`.toLowerCase();
          if (!hay.includes(text)) return false;
        }
        return true;
      }),
    [data?.logs, filterEventType, filterRange, filterLeadId, filterText],
  );

  const filteredRuns = useMemo(
    () =>
      (data?.runs || []).filter((r: any) => {
        if (!matchesTime(r.ran_at)) return false;
        if (!matchesNode(r.node_id)) return false;
        if (!matchesLead(r.lead_id)) return false;
        if (text) {
          const hay = `${r.node_type || ""} ${r.error || ""} ${nodeLabel(r.node_id)} ${r.lead_id || ""}`.toLowerCase();
          if (!hay.includes(text)) return false;
        }
        return true;
      }),
    [data?.runs, filterNodeId, filterRange, filterLeadId, filterText, canvas.nodes],
  );

  const filteredScheduled = useMemo(
    () =>
      (data?.scheduled || []).filter((j: any) => {
        const targetNode = j.payload?.start_from_node;
        if (!matchesNode(targetNode)) return false;
        if (!matchesLead(j.lead_id)) return false;
        if (text) {
          const hay = `${j.lead_id || ""} ${nodeLabel(targetNode || "")}`.toLowerCase();
          if (!hay.includes(text)) return false;
        }
        return true;
      }),
    [data?.scheduled, filterNodeId, filterLeadId, filterText, canvas.nodes],
  );

  const filtersActive =
    !!text ||
    filterEventType !== "all" ||
    filterNodeId !== "all" ||
    !!lead ||
    filterRange !== "24h";

  const clearFilters = () => {
    setFilterText("");
    setFilterEventType("all");
    setFilterNodeId("all");
    setFilterLeadId("");
    setFilterRange("24h");
  };

  const triggerNode = (canvas.nodes || []).find((n) => (n.data as any)?.kind === "trigger");
  const triggerSummary = triggerNode
    ? `${(triggerNode.data as any)?.label || (triggerNode.data as any)?.subType || "Unknown"}`
    : "No trigger configured";

  const handleTestRun = async (leadId: string, leadName: string) => {
    try {
      await testEnroll.mutateAsync({ workflow_id: workflowId, workspace_id: workspaceId, lead_id: leadId });
      toast({
        title: "Test enrollment started",
        description: `${leadName} is running through the workflow in test mode (no real sends).`,
      });
      setTimeout(() => refetch(), 1500);
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message || "Could not enroll lead", variant: "destructive" });
    }
  };

  const counts = data?.counts24h || { active: 0, completed: 0, exited: 0, failed: 0 };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Diagnostics</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Health summary */}
      <div className="border-b bg-muted/30 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Workflow status</span>
          <Badge variant={workflowStatus === "active" ? "default" : "outline"} className="capitalize">
            {workflowStatus}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Trigger</span>
          <span className="text-xs font-medium truncate max-w-[60%] text-right" title={triggerSummary}>
            {triggerSummary}
          </span>
        </div>
        {workflowStatus !== "active" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This workflow is not active. Leads won't enroll until you publish it.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="runs" className="text-xs">Step runs</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">
            Queue {filteredScheduled.length ? <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{filteredScheduled.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="test" className="text-xs">Test</TabsTrigger>
        </TabsList>

        {/* Filter bar — applies to Activity log, Step runs, Queue */}
        <div className="mx-4 mt-3 space-y-2 rounded-md border bg-muted/20 p-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages, errors, IDs…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterRange} onValueChange={(v) => setFilterRange(v as any)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h" className="text-xs">Last 1 hour</SelectItem>
                <SelectItem value="24h" className="text-xs">Last 24 hours</SelectItem>
                <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                <SelectItem value="all" className="text-xs">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEventType} onValueChange={setFilterEventType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Event type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All events</SelectItem>
                {eventTypeOptions.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterNodeId} onValueChange={setFilterNodeId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Node" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all" className="text-xs">All nodes</SelectItem>
                {nodeOptions.map((n) => (
                  <SelectItem key={n.id} value={n.id} className="text-xs">{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Lead ID contains…"
              value={filterLeadId}
              onChange={(e) => setFilterLeadId(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              <FilterX className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {/* OVERVIEW */}
          <TabsContent value="overview" className="px-4 py-3 space-y-4 mt-0">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Last 24 hours</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-3">
                      <div className="text-2xl font-bold">{counts.active || 0}</div>
                      <div className="text-xs text-muted-foreground">Active enrollments</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-emerald-600">{counts.completed || 0}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-amber-600">{counts.exited || 0}</div>
                      <div className="text-xs text-muted-foreground">Exited early</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-2xl font-bold text-destructive">{counts.failed || 0}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </Card>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Recent enrollments</div>
                  {data?.recentEnrollments.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      No enrollments yet. The trigger hasn't fired for any lead.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {data?.recentEnrollments.slice(0, 8).map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusDot status={e.status} />
                            <span className="truncate font-mono text-[10px] text-muted-foreground">{e.lead_id.slice(0, 8)}</span>
                            {e.is_test && <Badge variant="outline" className="h-4 px-1 text-[9px]">TEST</Badge>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground">{e.steps_executed || 0} steps</span>
                            <span className="text-muted-foreground">{timeAgo(e.started_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-muted-foreground">Activity log</div>
                    <span className="text-[10px] text-muted-foreground">{filteredLogs.length} of {data?.logs.length || 0}</span>
                  </div>
                  {filteredLogs.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      {filtersActive ? "No log events match your filters." : "No log events yet."}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredLogs.slice(0, 20).map((l: any) => (
                        <div key={l.id} className="rounded-md border px-2 py-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{l.event_type}</span>
                            <span className="text-muted-foreground">{timeAgo(l.created_at)}</span>
                          </div>
                          {l.lead_id && (
                            <div className="font-mono text-[10px] text-muted-foreground">lead {l.lead_id.slice(0, 8)}</div>
                          )}
                          {l.message && <div className="mt-0.5 text-muted-foreground">{l.message}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* STEP RUNS */}
          <TabsContent value="runs" className="px-4 py-3 mt-0">
            {filteredRuns.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                {filtersActive ? "No step runs match your filters." : "No step runs yet. Steps will appear here as leads move through the workflow."}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground">{filteredRuns.length} of {data?.runs.length || 0} runs</div>
                {filteredRuns.map((r: any) => (
                  <div key={r.id} className="rounded-md border px-2.5 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                        {r.status === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {r.status === "skipped" && <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="font-medium truncate">{nodeLabel(r.node_id)}</span>
                        {r.branch_taken && (
                          <Badge variant="outline" className={`h-4 px-1 text-[9px] ${r.branch_taken === "yes" ? "border-emerald-500/50 text-emerald-700" : "border-destructive/50 text-destructive"}`}>
                            {r.branch_taken.toUpperCase()}
                          </Badge>
                        )}
                        {r.is_test && <Badge variant="outline" className="h-4 px-1 text-[9px]">TEST</Badge>}
                      </div>
                      <span className="text-muted-foreground shrink-0">{timeAgo(r.ran_at)}</span>
                    </div>
                    {r.error && (
                      <div className="mt-1 rounded bg-destructive/10 px-1.5 py-1 font-mono text-[10px] text-destructive">
                        {r.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SCHEDULED */}
          <TabsContent value="scheduled" className="px-4 py-3 mt-0">
            {filteredScheduled.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                {filtersActive ? "No pending delays match your filters." : "No pending delays. When a lead hits a delay node, the next step will appear here with its run time."}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground">{filteredScheduled.length} of {data?.scheduled.length || 0} pending</div>
                {filteredScheduled.map((j: any) => (
                  <div key={j.id} className="rounded-md border px-2.5 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="font-medium truncate">
                          {j.payload?.start_from_node ? nodeLabel(j.payload.start_from_node) : "Next step"}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{timeUntil(j.run_at)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono">lead {j.lead_id?.slice(0, 8)}</span>
                      <span>{new Date(j.run_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEST */}
          <TabsContent value="test" className="px-4 py-3 mt-0 space-y-3">
            <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-xs">
              <div className="flex items-start gap-2">
                <FlaskConical className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">Test enrollment</div>
                  <p className="mt-0.5 text-muted-foreground">
                    Pick a lead — the engine runs every node in test mode. Real sends (email/SMS/WhatsApp) are skipped, no credits are charged, but tags / scores / notifications still update so you can verify wiring.
                  </p>
                </div>
              </div>
            </div>
            <Input
              placeholder="Search leads by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="space-y-1">
              {leads.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  No leads found.
                </div>
              ) : (
                leads.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.full_name || "(no name)"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{l.email}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0"
                      onClick={() => handleTestRun(l.id, l.full_name || l.email)}
                      disabled={testEnroll.isPending}
                    >
                      {testEnroll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run test"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
