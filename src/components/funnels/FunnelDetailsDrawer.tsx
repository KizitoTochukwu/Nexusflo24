import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Eye, Users, DollarSign, TrendingUp, Smartphone, Monitor, Tablet,
} from "lucide-react";
import { format } from "date-fns";
import {
  useFunnelSteps, useFunnelVisits, useUpdateFunnel,
  OBJECTIVE_OPTIONS, STEP_TYPE_OPTIONS, type Funnel,
} from "@/hooks/useFunnels";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import FunnelStepEditor from "./FunnelStepEditor";

interface Props {
  funnel: Funnel | null;
  open: boolean;
  onClose: () => void;
}

export default function FunnelDetailsDrawer({ funnel, open, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: steps = [] } = useFunnelSteps(funnel?.id ?? null);
  const { data: visits = [] } = useFunnelVisits(funnel?.id ?? null);
  const updateFunnel = useUpdateFunnel();

  const [editName, setEditName] = useState("");
  const [editObjective, setEditObjective] = useState("");

  const handleOpen = () => {
    if (funnel) {
      setEditName(funnel.name);
      setEditObjective(funnel.objective);
    }
  };

  const saveMeta = () => {
    if (!funnel) return;
    updateFunnel.mutate({
      id: funnel.id,
      workspace_id: workspaceId,
      name: editName,
      objective: editObjective,
    });
  };

  const handleStepsUpdate = (newSteps: { step_type: string; page_content: Record<string, unknown> }[]) => {
    if (!funnel) return;
    updateFunnel.mutate({
      id: funnel.id,
      workspace_id: workspaceId,
      steps: newSteps,
    });
  };

  // Analytics computations
  const totalVisitors = visits.length;
  const conversions = visits.filter((v) => v.converted).length;
  const optinRate = totalVisitors ? ((conversions / totalVisitors) * 100).toFixed(1) : "0";

  const deviceBreakdown = visits.reduce(
    (acc, v) => {
      const d = v.device_type || "desktop";
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const stepStats = steps.map((step) => {
    const stepVisits = visits.filter((v) => v.step_id === step.id);
    const stepConversions = stepVisits.filter((v) => v.converted).length;
    return {
      ...step,
      visits: stepVisits.length,
      conversions: stepConversions,
      rate: stepVisits.length ? ((stepConversions / stepVisits.length) * 100).toFixed(1) : "0",
    };
  });

  const utmSources = visits.reduce(
    (acc, v) => {
      if (v.utm_source) acc[v.utm_source] = (acc[v.utm_source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!funnel) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl" onOpenAutoFocus={handleOpen}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {funnel.name}
            <Badge variant="outline" className="text-xs">{funnel.status}</Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="builder" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Builder tab */}
          <TabsContent value="builder" className="mt-4 space-y-4">
            <FunnelStepEditor steps={steps} onReorder={handleStepsUpdate} />
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col items-center p-4">
                  <Eye className="mb-1 h-5 w-5 text-accent" />
                  <span className="text-xl font-bold">{totalVisitors}</span>
                  <span className="text-xs text-muted-foreground">Visitors</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center p-4">
                  <Users className="mb-1 h-5 w-5 text-accent" />
                  <span className="text-xl font-bold">{conversions}</span>
                  <span className="text-xs text-muted-foreground">Conversions</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center p-4">
                  <TrendingUp className="mb-1 h-5 w-5 text-accent" />
                  <span className="text-xl font-bold">{optinRate}%</span>
                  <span className="text-xs text-muted-foreground">Opt-in Rate</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center p-4">
                  <DollarSign className="mb-1 h-5 w-5 text-accent" />
                  <span className="text-xl font-bold">$0</span>
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </CardContent>
              </Card>
            </div>

            {/* Drop-off visualization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Funnel Drop-off</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                {stepStats.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No visit data yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Device breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  {[
                    { key: "desktop", Icon: Monitor },
                    { key: "mobile", Icon: Smartphone },
                    { key: "tablet", Icon: Tablet },
                  ].map(({ key, Icon }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{deviceBreakdown[key] || 0}</span>
                      <span className="text-muted-foreground">{key}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* UTM sources */}
            {Object.keys(utmSources).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Traffic Sources (UTM)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(utmSources)
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, count]) => (
                          <TableRow key={source}>
                            <TableCell className="text-sm">{source}</TableCell>
                            <TableCell className="text-right text-sm">{count}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
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
            <Button onClick={saveMeta} disabled={updateFunnel.isPending}>
              {updateFunnel.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
