import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Eye, Users, TrendingUp, DollarSign, Monitor, Smartphone, Tablet,
  Play, Pause, ExternalLink,
} from "lucide-react";
import {
  useFunnels, useFunnelSteps, useFunnelVisits, useUpdateFunnel, useUpdateFunnelStep,
  OBJECTIVE_OPTIONS, STEP_TYPE_OPTIONS, type Funnel, type FunnelStep,
} from "@/hooks/useFunnels";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import FunnelStepEditor from "@/components/funnels/FunnelStepEditor";
import StepPageBuilder from "@/components/funnels/builder/StepPageBuilder";
import { type Block, generateId, BLOCK_DEFAULTS, type BlockType } from "@/components/funnels/builder/blockTypes";
import EmbedCodeDialog from "@/components/funnels/EmbedCodeDialog";

/** Ensure every block from the DB has an id and full default props merged in */
function normalizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: any) => {
    const type: BlockType = b.type && b.type in BLOCK_DEFAULTS ? b.type : "text";
    const defaults = BLOCK_DEFAULTS[type]();
    // Map AI-generated prop names to builder prop names
    const incomingProps = b.props || {};
    const mappedProps: Record<string, unknown> = {};

    if (type === "heading") {
      mappedProps.text = incomingProps.text || incomingProps.content || defaults.text;
      mappedProps.level = incomingProps.level || defaults.level;
      mappedProps.align = incomingProps.align || defaults.align;
    } else if (type === "text") {
      mappedProps.text = incomingProps.content || incomingProps.text || defaults.text;
      mappedProps.align = incomingProps.align || defaults.align;
    } else if (type === "button") {
      mappedProps.text = incomingProps.label || incomingProps.text || defaults.text;
      mappedProps.link = incomingProps.url || incomingProps.link || defaults.link;
      mappedProps.align = incomingProps.align || defaults.align;
      if (incomingProps.variant === "secondary") {
        mappedProps.backgroundColor = "#0B1F3B";
      } else if (incomingProps.variant === "outline") {
        mappedProps.backgroundColor = "transparent";
        mappedProps.textColor = "#D4AF37";
      }
    } else if (type === "form") {
      mappedProps.fields = incomingProps.fields || defaults.fields;
      mappedProps.buttonText = incomingProps.buttonText || defaults.buttonText;
    } else if (type === "image") {
      mappedProps.alt = incomingProps.alt || defaults.alt;
      if (incomingProps.width === "medium") mappedProps.width = "60%";
      else if (incomingProps.width === "small") mappedProps.width = "40%";
    } else if (type === "spacer") {
      const h = incomingProps.height;
      if (h === "sm") mappedProps.height = "20px";
      else if (h === "md") mappedProps.height = "40px";
      else if (h === "lg") mappedProps.height = "60px";
    }

    return {
      id: b.id || generateId(),
      type,
      props: { ...defaults, ...incomingProps, ...mappedProps },
      children: b.children ? normalizeBlocks(b.children) : undefined,
    };
  });
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  draft: "bg-muted text-muted-foreground border-border",
};

export default function FunnelDetailPage() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const { data: funnels, isLoading } = useFunnels(workspaceId);
  const funnel = funnels?.find((f) => f.id === funnelId) ?? null;
  const { data: steps = [] } = useFunnelSteps(funnelId ?? null);
  const { data: visits = [] } = useFunnelVisits(funnelId ?? null);
  const updateFunnel = useUpdateFunnel();
  const updateStep = useUpdateFunnelStep();

  const defaultTab = searchParams.get("tab") || "builder";
  const stepIdParam = searchParams.get("stepId");

  // Track which step is being edited in the visual builder
  const [editingStepId, setEditingStepId] = useState<string | null>(stepIdParam);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editSlug, setEditSlug] = useState("");

  useEffect(() => {
    if (funnel) {
      setEditName(funnel.name);
      setEditDescription(funnel.description || "");
      setEditObjective(funnel.objective);
      setEditSlug(funnel.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }, [funnel]);

  const handleStepsUpdate = (newSteps: { step_type: string; page_content: Record<string, unknown> }[]) => {
    if (!funnel) return;
    updateFunnel.mutate({ id: funnel.id, workspace_id: workspaceId, steps: newSteps });
  };

  const toggleStatus = () => {
    if (!funnel) return;
    const newStatus = funnel.status === "active" ? "paused" : "active";
    updateFunnel.mutate({ id: funnel.id, workspace_id: workspaceId, status: newStatus });
  };

  const saveSettings = () => {
    if (!funnel) return;
    updateFunnel.mutate({
      id: funnel.id,
      workspace_id: workspaceId,
      name: editName,
      description: editDescription,
      objective: editObjective,
    });
  };

  // Analytics
  const totalVisitors = visits.length;
  const conversions = visits.filter((v) => v.converted).length;
  const optinRate = totalVisitors ? ((conversions / totalVisitors) * 100).toFixed(1) : "0";

  const deviceBreakdown = visits.reduce(
    (acc, v) => { const d = v.device_type || "desktop"; acc[d] = (acc[d] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const stepStats = steps.map((step) => {
    const sv = visits.filter((v) => v.step_id === step.id);
    const sc = sv.filter((v) => v.converted).length;
    return { ...step, visits: sv.length, conversions: sc, rate: sv.length ? ((sc / sv.length) * 100).toFixed(1) : "0" };
  });

  const utmSources = visits.reduce(
    (acc, v) => { if (v.utm_source) acc[v.utm_source] = (acc[v.utm_source] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading funnel…</div>
      </DashboardLayout>
    );
  }

  if (!funnel) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Funnel not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/dashboard/${workspaceId}/funnels`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Funnels
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${workspaceId}/funnels`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{funnel.name}</h1>
              <Badge variant="outline" className={statusColors[funnel.status] || statusColors.draft}>
                {funnel.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {OBJECTIVE_OPTIONS.find((o) => o.value === funnel.objective)?.label || funnel.objective}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleStatus}>
            {funnel.status === "active" ? <><Pause className="mr-1.5 h-4 w-4" /> Pause</> : <><Play className="mr-1.5 h-4 w-4" /> Activate</>}
          </Button>
          <EmbedCodeDialog workspaceId={workspaceId} funnelName={funnel.name} />
          <Button variant="outline" size="sm" onClick={() => window.open(`/f/${funnel.slug || editSlug}`, "_blank")}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-4">
          {/* Step cards row */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Funnel Steps</CardTitle>
              <p className="text-xs text-muted-foreground">Click a step card to open the visual page builder below.</p>
            </CardHeader>
            <CardContent>
              <FunnelStepEditor
                steps={steps}
                onReorder={handleStepsUpdate}
                onStepClick={(step) => setEditingStepId(step.id)}
                activeStepId={editingStepId}
              />
            </CardContent>
          </Card>

          {/* Visual page builder for selected step */}
          {editingStepId && (() => {
            const activeStep = steps.find((s) => s.id === editingStepId);
            if (!activeStep) return null;
            const stepLabel = `${STEP_TYPE_OPTIONS.find((o) => o.value === activeStep.step_type)?.label || activeStep.step_type} — Step ${activeStep.step_order + 1}`;
            const initialBlocks = Array.isArray(activeStep.page_content?.blocks) ? activeStep.page_content.blocks as Block[] : [];
            return (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Editing: {stepLabel}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingStepId(null)}>Close Editor</Button>
                </div>
                <StepPageBuilder
                  key={editingStepId}
                  initialBlocks={initialBlocks}
                  stepLabel={stepLabel}
                  saving={updateStep.isPending}
                  onSave={(blocks) => {
                    updateStep.mutate({
                      id: activeStep.id,
                      page_content: { ...activeStep.page_content, blocks } as Record<string, unknown>,
                    });
                  }}
                />
              </div>
            );
          })()}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Eye, label: "Visitors", value: totalVisitors },
              { icon: Users, label: "Conversions", value: conversions },
              { icon: TrendingUp, label: "Opt-in Rate", value: `${optinRate}%` },
              { icon: DollarSign, label: "Revenue", value: "$0" },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <CardContent className="flex flex-col items-center p-5">
                  <Icon className="mb-2 h-5 w-5 text-accent" />
                  <span className="text-2xl font-bold">{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Funnel Drop-off</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stepStats.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No visit data yet.</p>}
              {stepStats.map((s, i) => {
                const pct = totalVisitors ? (s.visits / totalVisitors) * 100 : 0;
                const label = STEP_TYPE_OPTIONS.find((o) => o.value === s.step_type)?.label || s.step_type;
                return (
                  <div key={s.id || i}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{s.visits} visits · {s.rate}% conv.</span>
                    </div>
                    <Progress value={pct} className="mt-1 h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Device Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  {([
                    { key: "desktop", Icon: Monitor },
                    { key: "mobile", Icon: Smartphone },
                    { key: "tablet", Icon: Tablet },
                  ] as const).map(({ key, Icon }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{deviceBreakdown[key] || 0}</span>
                      <span className="text-muted-foreground">{key}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {Object.keys(utmSources).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Traffic Sources</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(utmSources).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span>{source}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Funnel Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Objective</Label>
                  <Select value={editObjective} onValueChange={setEditObjective}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OBJECTIVE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Funnel Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/f/</span>
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="max-w-xs" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/f/${funnel.slug || editSlug}`}
                    className="max-w-md text-sm bg-muted cursor-pointer"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      navigator.clipboard.writeText(`${window.location.origin}/f/${funnel.slug || editSlug}`);
                      toast.success("URL copied to clipboard");
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/f/${funnel.slug || editSlug}`, "_blank")}
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Open
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Click the URL to copy. Must be unique.</p>
              </div>
              <Button onClick={saveSettings} disabled={updateFunnel.isPending}>
                {updateFunnel.isPending ? "Saving…" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
