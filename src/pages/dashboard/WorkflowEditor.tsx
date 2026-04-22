import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Play, Pause, FlaskConical, Loader2, AlertTriangle,
  CheckCircle2, FileEdit, Archive, Pencil, X, Plus, ChevronDown,
} from "lucide-react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node,
  MarkerType, BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkflow, useUpdateWorkflow } from "@/hooks/useWorkflows";
import { findPaletteItem, type PaletteItem } from "@/lib/workflows/nodeLibrary";
import { validateWorkflow } from "@/lib/workflows/validation";
import type { WorkflowCanvasJSON, NodeData, WorkflowStatus } from "@/lib/workflows/types";
import { toast } from "@/hooks/use-toast";
import AutomationEmailEditor from "@/components/automations/email-editor/AutomationEmailEditor";
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "@/components/automations/email-editor/EmailTemplateSettings";
import StepPickerPanel from "@/components/workflows/StepPickerPanel";
import { WorkflowNodeCard, EndPill } from "@/components/workflows/WorkflowNodeCard";
import { verticalLayout, nextStackPosition } from "@/lib/workflows/autoLayout";

// React Flow custom node types — the trigger/action/end cards.
const NODE_TYPES = {
  workflow: WorkflowNodeCard,
  end: EndPill,
};

function WorkflowEditorInner() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflow(workspaceId, workflowId);
  const update = useUpdateWorkflow(workspaceId);

  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showMinimap, setShowMinimap] = useState(false);
  const [pickerMode, setPickerMode] = useState<"trigger" | "step">("trigger");
  const hydratedRef = useRef(false);

  // Hydrate from backend → React Flow state. Convert plain canvas nodes into
  // workflow custom-typed nodes so they render with the new card UI.
  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    const c = workflow.canvas_json as WorkflowCanvasJSON;
    const hydrated: Node[] = (c.nodes || []).map((n) => ({
      id: n.id,
      type: "workflow",
      position: n.position,
      data: { ...n.data } as any,
    }));
    setNodes(hydrated);
    setEdges(
      (c.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        type: "smoothstep",
        label: e.sourceHandle === "yes" ? "YES" : e.sourceHandle === "no" ? "NO" : undefined,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground))" },
        style: {
          stroke:
            e.sourceHandle === "no"
              ? "hsl(var(--destructive))"
              : e.sourceHandle === "yes"
              ? "hsl(var(--accent))"
              : "hsl(var(--muted-foreground))",
          strokeWidth: 1.5,
        },
      })),
    );
    setLastSavedAt(workflow.updated_at ? new Date(workflow.updated_at) : null);
    setDirty(false);
    setPickerMode(hydrated.length === 0 ? "trigger" : "step");
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
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.data as any).kind,
      position: n.position,
      // Strip injected UI handlers before persisting.
      data: stripUiData(n.data as any),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle as any,
    })),
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
            type: "smoothstep",
            animated: false,
            label: params.sourceHandle === "yes" ? "YES" : params.sourceHandle === "no" ? "NO" : undefined,
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground))" },
            style: {
              stroke:
                params.sourceHandle === "no"
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--accent))",
              strokeWidth: 1.5,
            },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const openInspectorFor = useCallback((id: string) => {
    setSelectedId(id);
    setPickerMode("step");
  }, []);

  // Inject the per-node `onOpenDetails` handler so cards open the inspector.
  const decoratedNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        type: n.type === "end" ? "end" : "workflow",
        data: {
          ...n.data,
          onOpenDetails: () => openInspectorFor(n.id),
          isSelected: n.id === selectedId,
        } as any,
      })),
    [nodes, selectedId, openInspectorFor],
  );

  const addNodeFromPalette = useCallback(
    (item: PaletteItem) => {
      const id = `n-${Date.now()}-${Math.floor(Math.random() * 999)}`;
      const data: NodeData = { kind: item.kind, subType: item.subType, label: item.label, config: {} };
      const position = nextStackPosition(nodes);
      const newNode: Node = { id, type: "workflow", position, data: data as any };
      const newNodes = [...nodes, newNode];

      // Auto-connect the previous bottom-most node to the new one for vertical flow,
      // unless the user is manually connecting. Trigger has no inbound.
      let newEdges = edges;
      if (item.kind !== "trigger") {
        const lastNode = nodes
          .filter((n) => (n.data as any)?.kind !== "trigger" || nodes.length === 1)
          .reduce<Node | null>((acc, n) => (!acc || n.position.y > acc.position.y ? n : acc), null);
        const candidate = lastNode ?? nodes[nodes.length - 1];
        if (candidate) {
          newEdges = addEdge(
            {
              id: `e-${candidate.id}-${id}-${Date.now()}`,
              source: candidate.id,
              target: id,
              type: "smoothstep",
              animated: false,
              markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground))" },
              style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
            },
            edges,
          );
        }
      }

      setNodes(verticalLayout(newNodes, newEdges));
      setEdges(newEdges);
      setSelectedId(id);
      setPickerMode("step");
    },
    [nodes, edges, setNodes, setEdges],
  );

  const persist = useCallback(
    async (extraPatch: Record<string, unknown> = {}) => {
      if (!workflow) return false;
      const canvas = buildCanvas();
      await update.mutateAsync({
        id: workflow.id,
        patch: { name: name.trim() || "Untitled workflow", canvas_json: canvas, ...extraPatch } as any,
      });
      setDirty(false);
      setLastSavedAt(new Date());
      return true;
    },
    [workflow, buildCanvas, name, update],
  );

  const handleSaveDraft = async () => {
    if (!workflow) return;
    setSaving(true);
    try {
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
        title: `Cannot turn on — ${errorCount} issue${errorCount === 1 ? "" : "s"} to fix`,
        description: liveIssues.find((i) => i.level === "error")?.message,
        variant: "destructive",
      });
      return;
    }
    setPublishing(true);
    try {
      await persist({ status: "active" });
      toast({ title: "Workflow turned on", description: "It's now live and will enroll matching leads." });
    } catch (err: any) {
      toast({ title: "Could not turn on", description: err?.message || "Try again.", variant: "destructive" });
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

  const handleClearCanvas = () => {
    if (!confirm("Clear all nodes from the canvas? This cannot be undone until you save.")) return;
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setPickerMode("trigger");
  };

  const handleAutoLayout = () => {
    setNodes(verticalLayout(nodes, edges));
  };

  const handleDeleteWorkflow = async () => {
    if (!workflow) return;
    if (!confirm(`Delete "${workflow.name}" permanently?`)) return;
    await update.mutateAsync({ id: workflow.id, patch: { status: "archived" } as any });
    toast({ title: "Workflow archived" });
    navigate(`/dashboard/${workspaceId}/workflows`);
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
  const lastSavedLabel = lastSavedAt
    ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not saved yet";

  return (
    <DashboardLayout>
      <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col bg-muted/40 lg:-m-8">
        {/* ─── Dark command bar ─── */}
        <header className="flex h-14 items-center justify-between bg-primary px-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => {
                if (dirty && !confirm("You have unsaved changes. Leave anyway?")) return;
                navigate(`/dashboard/${workspaceId}/workflows`);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </div>

          {/* Centered editable title */}
          <div className="flex items-center gap-2">
            {editingName ? (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                className="h-8 w-72 border-primary-foreground/30 bg-primary-foreground/10 text-center text-primary-foreground placeholder:text-primary-foreground/50"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-primary-foreground/10"
              >
                <span className="text-base font-semibold">{name || "Untitled workflow"}</span>
                <Pencil className="h-3.5 w-3.5 opacity-70" />
              </button>
            )}
            <span className="hidden text-xs text-primary-foreground/60 md:inline">
              {dirty ? <span className="text-amber-300">● Unsaved</span> : lastSavedLabel}
            </span>
          </div>

          {/* Right cluster: status chip + action buttons */}
          <div className="flex items-center gap-2">
            {status && (
              <Badge
                variant="outline"
                className="border-primary-foreground/30 bg-primary-foreground/10 capitalize text-primary-foreground"
              >
                {status}
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {errorCount}
              </Badge>
            )}
            {errorCount === 0 && warningCount > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-300/60 text-amber-200">
                <AlertTriangle className="h-3 w-3" /> {warningCount}
              </Badge>
            )}

            {status === "active" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={() => handleStatusChange("paused")}
                >
                  <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={() => handleStatusChange("draft")}
                >
                  <FileEdit className="mr-1 h-3.5 w-3.5" /> Unpublish
                </Button>
              </>
            ) : status === "paused" ? (
              <Button
                size="sm"
                className="h-8 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleStatusChange("active")}
                disabled={errorCount > 0}
              >
                <Play className="mr-1 h-3.5 w-3.5" /> Resume
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                onClick={handlePublish}
                disabled={publishing || errorCount > 0}
                title={errorCount > 0 ? "Fix validation errors before turning on" : "Save & activate this workflow"}
              >
                {publishing ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1 h-3.5 w-3.5" />
                )}
                Review and turn on
              </Button>
            )}
          </div>
        </header>

        {/* ─── Menu strip (File / Edit / Settings / View / Help) ─── */}
        <div className="flex h-10 items-center gap-1 border-b border-border bg-background px-3 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded px-3 py-1 text-foreground hover:bg-muted">
              File <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleSaveDraft} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> Save draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/workflows`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to all workflows
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteWorkflow}>
                <Archive className="mr-2 h-4 w-4" /> Archive workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded px-3 py-1 text-foreground hover:bg-muted">
              Edit <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleAutoLayout}>Auto-arrange canvas</DropdownMenuItem>
              <DropdownMenuItem onClick={handleClearCanvas} className="text-destructive focus:text-destructive">
                Clear canvas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="rounded px-3 py-1 text-foreground hover:bg-muted"
            onClick={() => { setSelectedId(null); setPickerMode("step"); }}
          >
            Settings
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded px-3 py-1 text-foreground hover:bg-muted">
              View <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowMinimap((v) => !v)}>
                {showMinimap ? "Hide" : "Show"} minimap
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAutoLayout}>Fit to grid</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="rounded px-3 py-1 text-foreground hover:bg-muted"
            onClick={() => toast({ title: "Help", description: "Visit docs.nexusflo24.com for the workflow guide." })}
          >
            Help
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast({ title: "Test mode", description: "Coming soon — pick a lead and run dry." })}>
              <FlaskConical className="mr-1 h-3.5 w-3.5" /> Test
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSaveDraft} disabled={saving || publishing}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save draft
            </Button>
          </div>
        </div>

        {/* ─── Workspace ─── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: step picker */}
          <aside className="w-[340px] shrink-0 border-r border-border">
            <StepPickerPanel
              mode={pickerMode}
              title={pickerMode === "trigger" ? "Triggers" : "Add a step"}
              onPick={addNodeFromPalette}
              onSkip={() => setPickerMode("step")}
            />
          </aside>

          {/* Canvas */}
          <div className="relative flex-1 bg-muted/30">
            <ReactFlow
              nodes={decoratedNodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => openInspectorFor(n.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="hsl(var(--muted-foreground) / 0.25)" />
              {showMinimap && <MiniMap pannable zoomable className="!bg-background !border !border-border" />}
              <Controls className="!shadow-card" showInteractive={false} />
            </ReactFlow>

            {/* Empty state overlay — invites user to pick a trigger from the left */}
            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto rounded-xl border border-dashed border-border bg-card/80 px-8 py-6 text-center backdrop-blur">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Choose a trigger to start this workflow</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pick from the panel on the left, or skip to choose eligible records.</p>
                </div>
              </div>
            )}

            {/* Floating "Add step" button at the bottom of the stack */}
            {nodes.length > 0 && pickerMode === "step" && !selectedId && (
              <button
                onClick={() => setPickerMode("step")}
                className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-card"
              >
                Tip: pick an action from the left to add it under the last step
              </button>
            )}
          </div>

          {/* Right inspector */}
          {(selectedNode || pickerMode === "step") && selectedNode && (
            <aside className="w-[480px] shrink-0 border-l border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {findPaletteItem((selectedNode.data as any).subType || "")?.label || "Step settings"}
                </h3>
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ScrollArea className="h-[calc(100%-3.25rem)]">
                <div className="p-4">
                  <NodeInspector
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
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* Workflow settings inspector when no node is selected */}
          {!selectedNode && pickerMode === "step" && nodes.length > 0 && (
            <aside className="w-[480px] shrink-0 border-l border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Workflow settings</h3>
              </div>
              <ScrollArea className="h-[calc(100%-3.25rem)]">
                <div className="p-4">
                  <WorkflowSettings
                    workflow={workflow}
                    onUpdate={async (patch) => {
                      if (!workflow) return;
                      await update.mutateAsync({ id: workflow.id, patch });
                    }}
                  />
                </div>
              </ScrollArea>
            </aside>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/** Remove UI-only injected props before persisting. */
function stripUiData(data: any) {
  const { onOpenDetails, isSelected, ...rest } = data || {};
  return rest;
}

function NodeInspector({ node, onChange, onDelete }: { node: Node; onChange: (d: any) => void; onDelete: () => void }) {
  const data = node.data as unknown as NodeData;
  const palette = findPaletteItem(data.subType || "");
  const updateConfig = (key: string, value: any) => {
    onChange({ ...data, config: { ...(data.config || {}), [key]: value } });
  };
  const updateLabel = (label: string) => onChange({ ...data, label });

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

      {data.subType === "wait_delay" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duration</label>
            <Input type="number" value={(data.config?.duration as number) || 1} onChange={(e) => updateConfig("duration", Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Unit</label>
            <select
              value={(data.config?.unit as string) || "days"}
              onChange={(e) => updateConfig("unit", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        </div>
      )}

      {(data.subType === "add_tag" || data.subType === "remove_tag") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tag</label>
          <Input value={(data.config?.tag as string) || ""} onChange={(e) => updateConfig("tag", e.target.value)} className="mt-1" />
        </div>
      )}

      {(data.subType === "increase_score" || data.subType === "decrease_score") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Score change</label>
          <Input type="number" value={(data.config?.delta as number) || 10} onChange={(e) => updateConfig("delta", Number(e.target.value))} className="mt-1" />
        </div>
      )}

      {data.subType === "if_has_tag" || data.subType === "if_not_has_tag" ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tag to check</label>
          <Input value={(data.config?.tag as string) || ""} onChange={(e) => updateConfig("tag", e.target.value)} className="mt-1" />
        </div>
      ) : null}

      {(data.subType === "if_score_gt" || data.subType === "if_score_lt") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Score value</label>
          <Input type="number" value={(data.config?.value as number) || 50} onChange={(e) => updateConfig("value", Number(e.target.value))} className="mt-1" />
        </div>
      )}

      {(data.subType === "if_source_equals" || data.subType === "if_status_equals") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Equals</label>
          <Input value={(data.config?.value as string) || ""} onChange={(e) => updateConfig("value", e.target.value)} className="mt-1" />
        </div>
      )}

      {data.subType === "if_no_activity" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Days inactive</label>
          <Input type="number" value={(data.config?.days as number) || 7} onChange={(e) => updateConfig("days", Number(e.target.value))} className="mt-1" />
        </div>
      )}

      {data.subType === "webhook" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
          <Input value={(data.config?.url as string) || ""} onChange={(e) => updateConfig("url", e.target.value)} className="mt-1" placeholder="https://..." />
        </div>
      )}

      {data.kind === "condition" && (
        <Card className="bg-accent/5 p-3 text-xs text-muted-foreground">
          Connect this node's <strong className="text-accent">YES</strong> handle for the matched path
          and <strong className="text-destructive">NO</strong> for the negative path.
        </Card>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        Delete step
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
      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center gap-2">
          {issues.filter(i => i.level === "error").length === 0
            ? <><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-sm font-medium">Ready to turn on</span></>
            : <><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm font-medium">Fix before turning on</span></>}
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
