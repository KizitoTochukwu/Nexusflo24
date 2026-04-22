import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Workflow as WorkflowIcon, Sparkles, Play, Pause, Archive, Trash2, MoreVertical, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkflows, useWorkflowTemplates, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow } from "@/hooks/useWorkflows";
import { TEMPLATE_SEEDS } from "@/lib/workflows/templateSeeds";
import { toast } from "@/hooks/use-toast";
import type { Workflow, WorkflowStatus } from "@/lib/workflows/types";

const STATUS_COLOR: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
};

export default function DashboardWorkflows() {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const [tab, setTab] = useState("my");

  const { data: workflows = [], isLoading } = useWorkflows(workspaceId);
  const { data: dbTemplates = [] } = useWorkflowTemplates();
  const create = useCreateWorkflow(workspaceId);
  const update = useUpdateWorkflow(workspaceId);
  const remove = useDeleteWorkflow(workspaceId);

  // If templates table is empty, fall back to in-code seeds so the gallery is never empty
  const templates = useMemo(() => {
    if (dbTemplates && dbTemplates.length > 0) return dbTemplates as any[];
    return TEMPLATE_SEEDS.map((t) => ({ ...t }));
  }, [dbTemplates]);

  const handleUseTemplate = async (tmpl: any) => {
    const created = await create.mutateAsync({
      name: tmpl.name,
      description: tmpl.description,
      canvas_json: tmpl.canvas_json,
      template_slug: tmpl.slug,
    });
    toast({ title: "Workflow created from template", description: tmpl.name });
    navigate(`/dashboard/${workspaceId}/workflows/${created.id}`);
  };

  const handleNewBlank = async () => {
    const created = await create.mutateAsync({
      name: "Untitled workflow",
      description: "",
      canvas_json: { nodes: [], edges: [] },
    });
    navigate(`/dashboard/${workspaceId}/workflows/${created.id}`);
  };

  const handleStatusChange = async (wf: Workflow, status: WorkflowStatus) => {
    await update.mutateAsync({ id: wf.id, patch: { status } });
    toast({ title: `Workflow ${status}` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
              <WorkflowIcon className="h-7 w-7 text-accent" />
              Workflow Builder
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visual, behaviour-driven automation engine. Build sales nurtures, onboarding flows, and re-engagement sequences.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTab("templates")}>
              <Sparkles className="mr-2 h-4 w-4" /> Browse templates
            </Button>
            <Button onClick={handleNewBlank} disabled={create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> New workflow
            </Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="my">My workflow builders ({workflows.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="mt-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : workflows.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <WorkflowIcon className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No workflow builders yet</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Start from a prebuilt template or build one from scratch on the visual canvas.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={() => setTab("templates")}>Browse templates</Button>
                    <Button onClick={handleNewBlank}><Plus className="mr-2 h-4 w-4" /> Create blank</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((wf) => (
                  <Card key={wf.id} className="group transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{wf.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{wf.description || "No description"}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {wf.status !== "active" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(wf, "active")}>
                              <Play className="mr-2 h-4 w-4" /> Activate
                            </DropdownMenuItem>
                          )}
                          {wf.status === "active" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(wf, "paused")}>
                              <Pause className="mr-2 h-4 w-4" /> Pause
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStatusChange(wf, "archived")}>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                              if (!confirm(`Delete "${wf.name}"?`)) return;
                              await remove.mutateAsync(wf.id);
                              toast({ title: "Workflow deleted" });
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <Badge className={STATUS_COLOR[wf.status]}>{wf.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/${workspaceId}/workflows/${wf.id}`)}>
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tmpl: any) => (
                <Card key={tmpl.slug} className={`transition-shadow hover:shadow-md ${tmpl.is_featured ? "border-accent/50 ring-1 ring-accent/30" : ""}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{tmpl.category}</Badge>
                      {tmpl.is_featured && <Badge className="bg-accent text-accent-foreground"><Sparkles className="mr-1 h-3 w-3" /> Featured</Badge>}
                    </div>
                    <CardTitle className="mt-2 text-base">{tmpl.name}</CardTitle>
                    <CardDescription className="line-clamp-3">{tmpl.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => handleUseTemplate(tmpl)} disabled={create.isPending}>
                      Use this template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
