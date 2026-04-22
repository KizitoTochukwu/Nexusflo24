import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Play, Pause, FlaskConical, Loader2, AlertTriangle, CheckCircle2, FileEdit, Archive } from "lucide-react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkflow, useUpdateWorkflow } from "@/hooks/useWorkflows";
import { useLeadFolders } from "@/hooks/useLeadFolders";
import { PIPELINE_STAGES } from "@/hooks/useLeads";
import { TRIGGERS, ACTIONS, CONDITIONS, FLOW_NODES, findPaletteItem, type PaletteItem } from "@/lib/workflows/nodeLibrary";
import { validateWorkflow } from "@/lib/workflows/validation";
import type { WorkflowCanvasJSON, NodeData, WorkflowStatus } from "@/lib/workflows/types";
import { toast } from "@/hooks/use-toast";
import AutomationEmailEditor from "@/components/automations/email-editor/AutomationEmailEditor";
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "@/components/automations/email-editor/EmailTemplateSettings";

function WorkflowEditorInner() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflow(workspaceId, workflowId);
  const update = useUpdateWorkflow(workspaceId);

  const [name, setName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    const c = workflow.canvas_json as WorkflowCanvasJSON;
    setNodes(
      (c.nodes || []).map((n) => ({
        id: n.id, type: "default", position: n.position,
        data: { ...n.data } as any,
        style: nodeStyle(n.data.kind),
      }))
    );
    setEdges(
      (c.edges || []).map((e) => ({
        id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle,
        label: e.sourceHandle === "yes" ? "YES" : e.sourceHandle === "no" ? "NO" : undefined,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: e.sourceHandle === "no" ? "hsl(var(--destructive))" : e.sourceHandle === "yes" ? "hsl(var(--accent))" : "hsl(var(--primary))" },
      }))
    );
    setLastSavedAt(workflow.updated_at ? new Date(workflow.updated_at) : null);
    setDirty(false);
    hydratedRef.current = false;
    queueMicrotask(() => { hydratedRef.current = true; });
  }, [workflow, setNodes, setEdges]);

  // Track unsaved changes after hydration
  useEffect(() => {
    if (hydratedRef.current) setDirty(true);
  }, [nodes, edges, name]);

  // Warn before unloading with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const buildCanvas = useCallback((): WorkflowCanvasJSON => ({
    nodes: nodes.map((n) => ({ id: n.id, type: (n.data as any).kind, position: n.position, data: n.data as any })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle as any })),
  }), [nodes, edges]);

  const liveIssues = useMemo(() => {
    if (!workflow) return [];
    return validateWorkflow(buildCanvas());
  }, [workflow, buildCanvas]);
  const errorCount = liveIssues.filter((i) => i.level === "error").length;
  const warningCount = liveIssues.filter((i) => i.level === "warning").length;

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            animated: true,
            label: params.sourceHandle === "yes" ? "YES" : params.sourceHandle === "no" ? "NO" : undefined,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: params.sourceHandle === "no" ? "hsl(var(--destructive))" : "hsl(var(--accent))" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addNodeFromPalette = (item: PaletteItem) => {
    const id = `n-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    const data: NodeData = { kind: item.kind, subType: item.subType, label: item.label, config: {} };
    setNodes((nds) => [
      ...nds,
      { id, type: "default", position: { x: 200 + Math.random() * 300, y: 100 + nds.length * 80 },
        data: data as any, style: nodeStyle(item.kind) },
    ]);
    setSelectedId(id);
  };

  const persist = useCallback(async (extraPatch: Record<string, unknown> = {}) => {
    if (!workflow) return false;
    const canvas = buildCanvas();
    await update.mutateAsync({ id: workflow.id, patch: { name: name.trim() || "Untitled workflow", canvas_json: canvas, ...extraPatch } as any });
    setDirty(false);
    setLastSavedAt(new Date());
    return true;
  }, [workflow, buildCanvas, name, update]);

  const handleSaveDraft = async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      // Saving from a non-active state keeps it as draft; from active, we keep it active (just persist canvas).
      await persist(workflow.status === "active" ? {} : { status: "draft" });
      toast({ title: "Draft saved" });
    } catch (err: any) {
      toast({ title: "Could not save", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflow) return;
    if (errorCount > 0) {
      toast({
        title: `Cannot publish — ${errorCount} issue${errorCount === 1 ? "" : "s"} to fix`,
        description: liveIssues.find((i) => i.level === "error")?.message,
        variant: "destructive",
      });
      return;
    }
    setPublishing(true);
    try {
      await persist({ status: "active" });
      toast({ title: "Workflow published", description: "It's now live and will enroll matching leads." });
    } catch (err: any) {
      toast({ title: "Publish failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const handleStatusChange = async (status: WorkflowStatus) => {
    if (!workflow) return;
    try {
      await update.mutateAsync({ id: workflow.id, patch: { status } });
      const labels: Record<WorkflowStatus, string> = {
        draft: "Workflow reverted to draft",
        active: "Workflow activated",
        paused: "Workflow paused — pending sends will hold",
        archived: "Workflow archived",
      };
      toast({ title: labels[status] });
    } catch (err: any) {
      toast({ title: "Status change failed", description: err?.message || "Try again.", variant: "destructive" });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  const status = workflow?.status as WorkflowStatus | undefined;
  const statusBadgeVariant: "default" | "secondary" | "outline" =
    status === "active" ? "default" : status === "paused" ? "secondary" : "outline";
  const lastSavedLabel = lastSavedAt
    ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not saved yet";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => {
              if (dirty && !confirm("You have unsaved changes. Leave anyway?")) return;
              navigate(`/dashboard/${workspaceId}/workflows`);
            }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-72" />
            <Badge variant={statusBadgeVariant} className="capitalize">{status}</Badge>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {dirty ? <span className="text-amber-600">● Unsaved changes</span> : lastSavedLabel}
            </span>
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {errorCount} error{errorCount === 1 ? "" : "s"}
              </Badge>
            )}
            {errorCount === 0 && warningCount > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {warningCount} warning{warningCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => toast({ title: "Test mode", description: "Coming soon — pick a lead and run dry." })}>
              <FlaskConical className="mr-1 h-4 w-4" /> Test
            </Button>
            <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={saving || publishing}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save draft
            </Button>
            {status === "active" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("paused")}>
                  <Pause className="mr-1 h-4 w-4" /> Pause
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("draft")}>
                  <FileEdit className="mr-1 h-4 w-4" /> Unpublish
                </Button>
              </>
            ) : status === "paused" ? (
              <>
                <Button size="sm" onClick={() => handleStatusChange("active")} disabled={errorCount > 0}>
                  <Play className="mr-1 h-4 w-4" /> Resume
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("archived")}>
                  <Archive className="mr-1 h-4 w-4" /> Archive
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing || errorCount > 0}
                title={errorCount > 0 ? "Fix validation errors before publishing" : "Save & activate this workflow"}
              >
                {publishing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                Publish
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Palette */}
          <aside className="w-60 border-r bg-card">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-3">
                <PaletteSection title="Triggers" items={TRIGGERS} onAdd={addNodeFromPalette} />
                <PaletteSection title="Actions" items={ACTIONS} onAdd={addNodeFromPalette} />
                <PaletteSection title="Logic" items={CONDITIONS} onAdd={addNodeFromPalette} />
                <PaletteSection title="Flow" items={FLOW_NODES} onAdd={addNodeFromPalette} />
              </div>
            </ScrollArea>
          </aside>

          {/* Canvas */}
          <div className="flex-1 bg-muted/20">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
            >
              <Background gap={16} />
              <MiniMap pannable zoomable />
              <Controls />
            </ReactFlow>
          </div>

          {/* Inspector */}
          <aside className="w-[480px] border-l bg-card">
            <ScrollArea className="h-full">
              <div className="p-4">
                {selectedNode ? (
                  <NodeInspector
                    workspaceId={workspaceId}
                    node={selectedNode}
                    onChange={(data) => {
                      setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data } : n)));
                    }}
                    onDelete={() => {
                      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                      setSelectedId(null);
                    }}
                  />
                ) : (
                  <WorkflowSettings
                    workflow={workflow}
                    onUpdate={async (patch) => {
                      if (!workflow) return;
                      await update.mutateAsync({ id: workflow.id, patch });
                    }}
                  />
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function nodeStyle(kind: string): React.CSSProperties {
  const base = {
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 500,
    minWidth: "180px",
  };
  if (kind === "trigger") return { ...base, background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", borderColor: "hsl(var(--accent))" };
  if (kind === "condition") return { ...base, background: "hsl(var(--card))", borderColor: "hsl(var(--primary))", color: "hsl(var(--primary))" };
  if (kind === "delay") return { ...base, background: "hsl(var(--muted))", color: "hsl(var(--foreground))" };
  if (kind === "goal") return { ...base, background: "hsl(142 76% 36%)", color: "white", borderColor: "hsl(142 76% 36%)" };
  return { ...base, background: "hsl(var(--card))", color: "hsl(var(--foreground))" };
}

function PaletteSection({ title, items, onAdd }: { title: string; items: PaletteItem[]; onAdd: (i: PaletteItem) => void }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-1">
        {items.map((it) => (
          <button
            key={it.subType}
            onClick={() => onAdd(it)}
            className="flex w-full items-start gap-2 rounded-md border bg-background p-2 text-left text-xs transition-colors hover:border-accent hover:bg-accent/5"
          >
            <it.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-foreground">{it.label}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const LEAD_STATUSES = ["New", "Warm", "Hot", "Won", "Lost"];
const LIFECYCLE_STAGES = ["Subscriber", "Lead", "MQL", "SQL", "Opportunity", "Customer", "Evangelist"];
const LEAD_SOURCES = ["Landing Page", "WhatsApp", "Facebook Ad", "Referral", "Organic", "Other"];
const SCORE_THRESHOLD_OPS = [
  { value: "gte", label: "Greater than or equal to (≥)" },
  { value: "gt", label: "Greater than (>)" },
  { value: "lte", label: "Less than or equal to (≤)" },
  { value: "lt", label: "Less than (<)" },
  { value: "eq", label: "Equal to (=)" },
];
const WAIT_UNITS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
];
const WEBHOOK_METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

function useWorkspaceTags(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-lead-tags", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as string[];
      const { data, error } = await supabase
        .from("leads")
        .select("tags")
        .eq("workspace_id", workspaceId)
        .limit(1000);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r: any) => (r.tags || []).forEach((t: string) => t && set.add(t)));
      return Array.from(set).sort();
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

function SelectField({
  label, value, onChange, placeholder, options, allowCustom,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  allowCustom?: boolean;
}) {
  const knownValues = options.map((o) => o.value);
  const isCustom = !!value && !knownValues.includes(value);
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={isCustom ? "__custom__" : value || ""} onValueChange={(v) => onChange(v === "__custom__" ? value || "" : v)}>
        <SelectTrigger className="mt-1"><SelectValue placeholder={placeholder || "Select…"} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
          {allowCustom && <SelectItem value="__custom__">Custom value…</SelectItem>}
        </SelectContent>
      </Select>
      {allowCustom && isCustom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom value"
          className="mt-2"
        />
      )}
    </div>
  );
}

function NodeInspector({ workspaceId, node, onChange, onDelete }: { workspaceId: string; node: Node; onChange: (d: any) => void; onDelete: () => void }) {
  const data = node.data as unknown as NodeData;
  const palette = findPaletteItem(data.subType || "");
  const updateConfig = (key: string, value: any) => {
    onChange({ ...data, config: { ...(data.config || {}), [key]: value } });
  };
  const updateLabel = (label: string) => onChange({ ...data, label });

  const { data: folders = [] } = useLeadFolders(workspaceId);
  const { data: tags = [] } = useWorkspaceTags(workspaceId);

  const tagOptions = tags.map((t) => ({ value: t, label: t }));
  const folderOptions = folders.map((f) => ({ value: f.id, label: f.name }));
  const statusOptions = LEAD_STATUSES.map((s) => ({ value: s, label: s }));
  const lifecycleOptions = LIFECYCLE_STAGES.map((s) => ({ value: s, label: s }));
  const sourceOptions = LEAD_SOURCES.map((s) => ({ value: s, label: s }));
  const pipelineOptions = PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div className="space-y-4">
      <div>
        <Badge variant="outline" className="mb-2 capitalize">{data.kind}</Badge>
        <h3 className="text-base font-semibold">{palette?.label || data.label}</h3>
        <p className="text-xs text-muted-foreground">{palette?.description}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Label</label>
        <Input value={(data.label as string) || ""} onChange={(e) => updateLabel(e.target.value)} className="mt-1" />
      </div>

      {/* Email config — full block editor (HubSpot-style) */}
      {data.subType === "send_email" && (
        <div className="rounded-md border bg-background p-2">
          <AutomationEmailEditor
            isEmail
            subject={(data.config?.subject as string) || ""}
            message={(data.config?.body as string) || ""}
            onSubjectChange={(v) => updateConfig("subject", v)}
            onMessageChange={(v) => updateConfig("body", v)}
            templateSettings={(data.config?.templateSettings as TemplateSettings) || DEFAULT_TEMPLATE_SETTINGS}
            onTemplateSettingsChange={(s) => updateConfig("templateSettings", s)}
          />
        </div>
      )}

      {(data.subType === "send_sms" || data.subType === "send_whatsapp") && (
        <div className="rounded-md border bg-background p-2">
          <AutomationEmailEditor
            isEmail={false}
            subject=""
            message={(data.config?.message as string) || ""}
            onSubjectChange={() => {}}
            onMessageChange={(v) => updateConfig("message", v)}
          />
        </div>
      )}

      {/* TRIGGER: lead added to folder */}
      {data.subType === "lead_added_to_folder" && (
        <SelectField
          label="Folder"
          value={(data.config?.folderId as string) || ""}
          placeholder={folders.length ? "Select a folder" : "No folders yet"}
          options={folderOptions}
          onChange={(v) => updateConfig("folderId", v)}
        />
      )}

      {/* TRIGGER: lead tagged (specific tag) */}
      {data.subType === "lead_tagged" && (
        <SelectField
          label="Tag"
          value={(data.config?.tag as string) || ""}
          placeholder={tags.length ? "Select a tag" : "No tags yet"}
          options={tagOptions}
          allowCustom
          onChange={(v) => updateConfig("tag", v)}
        />
      )}

      {/* TRIGGER: score threshold */}
      {data.subType === "score_threshold" && (
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Operator"
            value={(data.config?.operator as string) || "gte"}
            options={SCORE_THRESHOLD_OPS}
            onChange={(v) => updateConfig("operator", v)}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Score</label>
            <Input type="number" value={(data.config?.value as number) || 50} onChange={(e) => updateConfig("value", Number(e.target.value))} className="mt-1" />
          </div>
        </div>
      )}

      {/* ACTION: Wait/Delay */}
      {data.subType === "wait_delay" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duration</label>
            <Input type="number" min={1} value={(data.config?.duration as number) || 1} onChange={(e) => updateConfig("duration", Number(e.target.value))} className="mt-1" />
          </div>
          <SelectField
            label="Unit"
            value={(data.config?.unit as string) || "days"}
            options={WAIT_UNITS}
            onChange={(v) => updateConfig("unit", v)}
          />
        </div>
      )}

      {/* ACTION: Add / Remove tag */}
      {(data.subType === "add_tag" || data.subType === "remove_tag") && (
        <SelectField
          label="Tag"
          value={(data.config?.tag as string) || ""}
          placeholder={tags.length ? "Select a tag" : "Type a new tag below"}
          options={tagOptions}
          allowCustom
          onChange={(v) => updateConfig("tag", v)}
        />
      )}

      {/* ACTION: Update status */}
      {data.subType === "update_status" && (
        <SelectField
          label="New status"
          value={(data.config?.status as string) || ""}
          options={statusOptions}
          onChange={(v) => updateConfig("status", v)}
        />
      )}

      {/* ACTION: Update lifecycle */}
      {data.subType === "update_lifecycle_stage" && (
        <SelectField
          label="Lifecycle stage"
          value={(data.config?.stage as string) || ""}
          options={lifecycleOptions}
          onChange={(v) => updateConfig("stage", v)}
        />
      )}

      {/* ACTION: Update pipeline stage */}
      {data.subType === "update_pipeline_stage" && (
        <SelectField
          label="Pipeline stage"
          value={(data.config?.stage as string) || ""}
          options={pipelineOptions}
          onChange={(v) => updateConfig("stage", v)}
        />
      )}

      {/* ACTION: Move to folder */}
      {data.subType === "move_to_folder" && (
        <SelectField
          label="Folder"
          value={(data.config?.folderId as string) || ""}
          placeholder={folders.length ? "Select a folder" : "No folders yet"}
          options={folderOptions}
          onChange={(v) => updateConfig("folderId", v)}
        />
      )}

      {/* ACTION: Score change */}
      {(data.subType === "increase_score" || data.subType === "decrease_score") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Score change</label>
          <Input type="number" min={1} value={(data.config?.delta as number) || 10} onChange={(e) => updateConfig("delta", Number(e.target.value))} className="mt-1" />
        </div>
      )}

      {/* ACTION: Webhook */}
      {data.subType === "webhook" && (
        <div className="space-y-2">
          <SelectField
            label="HTTP Method"
            value={(data.config?.method as string) || "POST"}
            options={WEBHOOK_METHODS.map((m) => ({ value: m, label: m }))}
            onChange={(v) => updateConfig("method", v)}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
            <Input value={(data.config?.url as string) || ""} onChange={(e) => updateConfig("url", e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
        </div>
      )}

      {/* CONDITION: tag-based */}
      {(data.subType === "if_has_tag" || data.subType === "if_not_has_tag") && (
        <SelectField
          label="Tag to check"
          value={(data.config?.tag as string) || ""}
          placeholder={tags.length ? "Select a tag" : "Type a tag below"}
          options={tagOptions}
          allowCustom
          onChange={(v) => updateConfig("tag", v)}
        />
      )}

      {/* CONDITION: score */}
      {(data.subType === "if_score_gt" || data.subType === "if_score_lt") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Score value</label>
          <Input type="number" value={(data.config?.value as number) || 50} onChange={(e) => updateConfig("value", Number(e.target.value))} className="mt-1" />
        </div>
      )}

      {/* CONDITION: source equals */}
      {data.subType === "if_source_equals" && (
        <SelectField
          label="Source equals"
          value={(data.config?.value as string) || ""}
          options={sourceOptions}
          allowCustom
          onChange={(v) => updateConfig("value", v)}
        />
      )}

      {/* CONDITION: status equals */}
      {data.subType === "if_status_equals" && (
        <SelectField
          label="Status equals"
          value={(data.config?.value as string) || ""}
          options={statusOptions}
          onChange={(v) => updateConfig("value", v)}
        />
      )}

      {/* CONDITION: lifecycle equals */}
      {data.subType === "if_lifecycle_equals" && (
        <SelectField
          label="Lifecycle equals"
          value={(data.config?.value as string) || ""}
          options={lifecycleOptions}
          onChange={(v) => updateConfig("value", v)}
        />
      )}

      {/* CONDITION: no activity */}
      {data.subType === "if_no_activity" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Days inactive</label>
            <Input type="number" min={1} value={(data.config?.days as number) || 7} onChange={(e) => updateConfig("days", Number(e.target.value))} className="mt-1" />
          </div>
          <SelectField
            label="Channel scope"
            value={(data.config?.channel as string) || "any"}
            options={[
              { value: "any", label: "Any channel" },
              { value: "email", label: "Email" },
              { value: "sms", label: "SMS" },
              { value: "whatsapp", label: "WhatsApp" },
            ]}
            onChange={(v) => updateConfig("channel", v)}
          />
        </div>
      )}

      {data.kind === "condition" && (
        <Card className="bg-accent/5 p-3 text-xs text-muted-foreground">
          Connect this node's <strong className="text-accent">YES</strong> handle for the matched path
          and <strong className="text-destructive">NO</strong> for the negative path.
        </Card>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        Delete node
      </Button>
    </div>
  );
}

function WorkflowSettings({ workflow, onUpdate }: { workflow: any; onUpdate: (p: any) => Promise<void> }) {
  const [reEnroll, setReEnroll] = useState(!!workflow?.enrollment_config?.reEnrollment);
  const [suppressTags, setSuppressTags] = useState((workflow?.suppression_config?.tags || []).join(", "));
  if (!workflow) return null;
  const issues = validateWorkflow(workflow.canvas_json);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Workflow settings</h3>

      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center gap-2">
          {issues.filter(i => i.level === "error").length === 0
            ? <><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-sm font-medium">Ready to publish</span></>
            : <><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm font-medium">Fix before publishing</span></>}
        </div>
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground">No issues found.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {issues.map((i, idx) => (
              <li key={idx} className={i.level === "error" ? "text-destructive" : "text-amber-600"}>• {i.message}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reEnroll} onChange={async (e) => { setReEnroll(e.target.checked); await onUpdate({ enrollment_config: { ...workflow.enrollment_config, reEnrollment: e.target.checked } }); }} />
          Allow re-enrollment
        </label>
        <p className="ml-5 mt-1 text-xs text-muted-foreground">Re-enter leads who match the trigger again.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Suppress leads with tags (comma-separated)</label>
        <Input
          value={suppressTags}
          onChange={(e) => setSuppressTags(e.target.value)}
          onBlur={async () => {
            const tags = suppressTags.split(",").map((t) => t.trim()).filter(Boolean);
            await onUpdate({ suppression_config: { ...workflow.suppression_config, tags } });
          }}
          className="mt-1"
          placeholder="customer, unsubscribed"
        />
      </div>
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
