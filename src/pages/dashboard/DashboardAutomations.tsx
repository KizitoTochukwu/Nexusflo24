import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Zap, MoreHorizontal, Play, Pause, Trash2, Copy, Eye, Clock } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useAutomations, useDeleteAutomation, useUpdateAutomation, useCreateAutomation, useSimulateAutomation,
  type Automation, TRIGGER_OPTIONS,
} from "@/hooks/useAutomations";
import CreateAutomationDialog from "@/components/automations/CreateAutomationDialog";
import AutomationDetailsDrawer from "@/components/automations/AutomationDetailsDrawer";
import { format } from "date-fns";

const DashboardAutomations = () => {
  const workspaceId = useWorkspaceId();
  const { data: automations, isLoading } = useAutomations(workspaceId);
  const deleteAutomation = useDeleteAutomation();
  const updateAutomation = useUpdateAutomation();
  const createAutomation = useCreateAutomation();
  const simulate = useSimulateAutomation();

  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

      <div className="mt-6 rounded-xl border bg-card shadow-card">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading automations…</div>
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((a) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetails(a)}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{triggerLabel(a.trigger_type)}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.last_run_at ? (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.last_run_at), "MMM d, HH:mm")}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{a.run_count}</TableCell>
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
              ))}
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
