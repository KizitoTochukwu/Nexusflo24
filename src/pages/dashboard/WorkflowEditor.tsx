import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Play, Pause, FlaskConical, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkflow, useUpdateWorkflow } from "@/hooks/useWorkflows";
import { TRIGGERS, ACTIONS, CONDITIONS, FLOW_NODES, findPaletteItem, type PaletteItem } from "@/lib/workflows/nodeLibrary";
import { validateWorkflow } from "@/lib/workflows/validation";
import type { WorkflowCanvasJSON, NodeData, WorkflowStatus } from "@/lib/workflows/types";
import { toast } from "@/hooks/use-toast";

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
  }, [workflow, setNodes, setEdges]);

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

  const handleSave = async () => {
    if (!workflow) return;
    setSaving(true);
    const canvas: WorkflowCanvasJSON = {
      nodes: nodes.map((n) => ({ id: n.id, type: (n.data as any).kind, position: n.position, data: n.data as any })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle as any })),
    };
    await update.mutateAsync({ id: workflow.id, patch: { name, canvas_json: canvas } });
    setSaving(false);
    toast({ title: "Saved" });
  };

  const handleStatus = async (status: WorkflowStatus) => {
    if (!workflow) return;
    const issues = validateWorkflow({
      nodes: nodes.map((n) => ({ id: n.id, type: (n.data as any).kind, position: n.position, data: n.data as any })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle as any })),
    });
    const errors = issues.filter((i) => i.level === "error");
    if (status === "active" && errors.length) {
      toast({ title: "Cannot publish", description: errors[0].message, variant: "destructive" });
      return;
    }
    await update.mutateAsync({ id: workflow.id, patch: { status } });
    toast({ title: status === "active" ? "Workflow published" : "Workflow paused" });
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${workspaceId}/workflows`)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-72" />
            <Badge variant={workflow?.status === "active" ? "default" : "outline"}>{workflow?.status}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast({ title: "Test mode", description: "Coming soon — pick a lead and run dry." })}>
              <FlaskConical className="mr-1 h-4 w-4" /> Test
            </Button>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
            {workflow?.status === "active" ? (
              <Button size="sm" variant="outline" onClick={() => handleStatus("paused")}>
                <Pause className="mr-1 h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleStatus("active")}>
                <Play className="mr-1 h-4 w-4" /> Publish
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
          <aside className="w-80 border-l bg-card">
            <ScrollArea className="h-full">
              <div className="p-4">
                {selectedNode ? (
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

function NodeInspector({ node, onChange, onDelete }: { node: Node; onChange: (d: any) => void; onDelete: () => void }) {
  const data = node.data as NodeData;
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

      {/* Email config */}
      {data.subType === "send_email" && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input value={(data.config?.subject as string) || ""} onChange={(e) => updateConfig("subject", e.target.value)} className="mt-1" placeholder="Hi {{first_name|there}}" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Body (HTML allowed)</label>
            <textarea
              value={(data.config?.body as string) || ""}
              onChange={(e) => updateConfig("body", e.target.value)}
              className="mt-1 min-h-[120px] w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Use {{first_name|there}}, {{full_name}}, {{score}}…"
            />
          </div>
        </>
      )}

      {(data.subType === "send_sms" || data.subType === "send_whatsapp") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <textarea
            value={(data.config?.message as string) || ""}
            onChange={(e) => updateConfig("message", e.target.value)}
            className="mt-1 min-h-[100px] w-full rounded-md border bg-background p-2 text-sm"
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
        Delete node
      </Button>
    </div>
  );
}

function WorkflowSettings({ workflow, onUpdate }: { workflow: any; onUpdate: (p: any) => Promise<void> }) {
  if (!workflow) return null;
  const [reEnroll, setReEnroll] = useState(!!workflow.enrollment_config?.reEnrollment);
  const [suppressTags, setSuppressTags] = useState((workflow.suppression_config?.tags || []).join(", "));
  const issues = validateWorkflow(workflow.canvas_json);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Workflow settings</h3>

      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center gap-2">
          {issues.filter(i => i.level === "error").length === 0
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-sm font-medium">Ready to publish</span></>
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
