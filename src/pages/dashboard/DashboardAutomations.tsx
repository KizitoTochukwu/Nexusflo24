import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Zap, MoreHorizontal, Play, Pause, Trash2, Copy, Eye, Clock, DoorOpen, Sparkles, X, AlertTriangle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useAutomations, useDeleteAutomation, useUpdateAutomation, useCreateAutomation, useSimulateAutomation,
  useWorkspaceExitedCounts, useBackfillExitDefaults,
  type Automation, TRIGGER_OPTIONS,
} from "@/hooks/useAutomations";
import { getDefaultExitCriteria } from "@/lib/automations/exitCriteria";
import CreateAutomationDialog from "@/components/automations/CreateAutomationDialog";
import AutomationDetailsDrawer from "@/components/automations/AutomationDetailsDrawer";
import { format } from "date-fns";

const DashboardAutomations = () => {
  const workspaceId = useWorkspaceId();
  const { data: automations, isLoading, isError, error, refetch, isFetching } = useAutomations(workspaceId);
  const deleteAutomation = useDeleteAutomation();
  const updateAutomation = useUpdateAutomation();
  const createAutomation = useCreateAutomation();
  const simulate = useSimulateAutomation();
  const { data: exitedCounts } = useWorkspaceExitedCounts(workspaceId);
  const backfill = useBackfillExitDefaults();

  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Count nurture automations missing exit criteria — for the backfill banner.
  const missingExitCount = useMemo(() => {
    if (!automations) return 0;
    return automations.filter((a) => {
      const current = (a.exit_criteria ?? []) as unknown[];
      if (current.length > 0) return false;
      return getDefaultExitCriteria(a.trigger_type).length > 0;
    }).length;
  }, [automations]);

  const openDetails = (a: Automation) => {
    setSelectedAutomation(a);
    setDrawerOpen(true);
  };

  const handleDuplicate = (a: Automation) => {
    createAutomation.mutate({
      workspace_id: workspaceId,
      name: `${a.name} (copy)`,
      description: a.description,
      trigger_type: a.trigger_type,
      trigger_config: a.trigger_config,
      steps: [],
    });
  };

  const toggleStatus = (a: Automation) => {
    const newStatus = a.status === "active" ? "paused" : "active";
    updateAutomation.mutate({ id: a.id, workspace_id: workspaceId, status: newStatus });
  };

  const triggerLabel = (type: string) => TRIGGER_OPTIONS.find((t) => t.value === type)?.label || type;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      paused: "bg-amber-100 text-amber-700 border-amber-200",
      draft: "bg-muted text-muted-foreground border-border",
    };
    return <Badge variant="outline" className={colors[status] || colors.draft}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build trigger-based multi-step workflows.</p>
        </div>
        <CreateAutomationDialog />
      </div>

      {/* Backfill banner — surfaces legacy nurture automations missing exit criteria */}
      {!bannerDismissed && missingExitCount > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <DoorOpen className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-medium text-rose-900">
              {missingExitCount} nurture automation{missingExitCount === 1 ? "" : "s"} {missingExitCount === 1 ? "has" : "have"} no exit criteria
            </div>
            <p className="text-xs text-rose-800/80 mt-0.5">
              Leads in these flows will keep receiving messages even after they purchase or unsubscribe. Apply suggested defaults (Lead purchases + Lead unsubscribes) — you can fine-tune per automation afterwards.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-background gap-1.5 shrink-0"
            disabled={backfill.isPending}
            onClick={() => backfill.mutate(workspaceId)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {backfill.isPending ? "Applying…" : "Apply defaults to all"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setBannerDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-card shadow-card">
        {isLoading ? (
          <div className="p-6 space-y-3" aria-busy="true" aria-label="Loading automations">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="ml-auto h-4 w-10" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn't load automations</AlertTitle>
              <AlertDescription className="mt-1">
                {(error as Error)?.message || "Something went wrong while fetching your automations. Please try again."}
              </AlertDescription>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                  <RotateCcw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  {isFetching ? "Retrying…" : "Retry"}
                </Button>
              </div>
            </Alert>
          </div>
        ) : !automations?.length ? (
          <div className="p-10 text-center text-muted-foreground">
            <Zap className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">No automations yet</p>
            <p className="text-sm">Create your first automation to start engaging leads automatically.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Exited</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((a) => {
                const exitCount = exitedCounts?.[a.id] || 0;
                const hasExitRules = ((a.exit_criteria ?? []) as unknown[]).length > 0;
                return (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetails(a)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {a.name}
                      {hasExitRules && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[10px]">
                          <DoorOpen className="h-2.5 w-2.5" />
                          {((a.exit_criteria ?? []) as unknown[]).length} exit rule{((a.exit_criteria ?? []) as unknown[]).length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{triggerLabel(a.trigger_type)}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.last_run_at ? (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.last_run_at), "MMM d, HH:mm")}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{a.run_count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {exitCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <DoorOpen className="h-3 w-3" /> {exitCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openDetails(a)}>
                          <Eye className="mr-2 h-4 w-4" /> View / Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(a)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(a)}>
                          {a.status === "active" ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Activate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => simulate.mutate({ automationId: a.id, workspaceId })}>
                          <Zap className="mr-2 h-4 w-4" /> Simulate Run
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteAutomation.mutate(a.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <AutomationDetailsDrawer
        automation={selectedAutomation}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedAutomation(null); }}
      />
    </DashboardLayout>
  );
};

export default DashboardAutomations;
