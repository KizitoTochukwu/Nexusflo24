import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutTemplate, MoreHorizontal, Play, Pause, Trash2, Copy, Eye } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useFunnels, useDeleteFunnel, useUpdateFunnel, useCreateFunnel,
  OBJECTIVE_OPTIONS, type Funnel,
} from "@/hooks/useFunnels";
import CreateFunnelDialog from "@/components/funnels/CreateFunnelDialog";
import FunnelDetailsDrawer from "@/components/funnels/FunnelDetailsDrawer";
import { format } from "date-fns";

const DashboardFunnels = () => {
  const workspaceId = useWorkspaceId();
  const { data: funnels, isLoading } = useFunnels(workspaceId);
  const deleteFunnel = useDeleteFunnel();
  const updateFunnel = useUpdateFunnel();
  const createFunnel = useCreateFunnel();

  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDetails = (f: Funnel) => {
    setSelectedFunnel(f);
    setDrawerOpen(true);
  };

  const handleDuplicate = (f: Funnel) => {
    createFunnel.mutate({
      workspace_id: workspaceId,
      name: `${f.name} (copy)`,
      description: f.description,
      objective: f.objective,
      steps: [],
    });
  };

  const toggleStatus = (f: Funnel) => {
    const newStatus = f.status === "active" ? "paused" : "active";
    updateFunnel.mutate({ id: f.id, workspace_id: workspaceId, status: newStatus });
  };

  const objectiveLabel = (v: string) => OBJECTIVE_OPTIONS.find((o) => o.value === v)?.label || v;

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
          <h1 className="text-2xl font-bold">Funnels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Design and optimize your sales funnels.</p>
        </div>
        <CreateFunnelDialog />
      </div>

      <div className="mt-6 rounded-xl border bg-card shadow-card">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading funnels…</div>
        ) : !funnels?.length ? (
          <div className="p-10 text-center text-muted-foreground">
            <LayoutTemplate className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">No funnels yet</p>
            <p className="text-sm">Create your first funnel to start converting leads.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetails(f)}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{objectiveLabel(f.objective)}</TableCell>
                  <TableCell>{statusBadge(f.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(f.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openDetails(f)}>
                          <Eye className="mr-2 h-4 w-4" /> View / Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(f)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(f)}>
                          {f.status === "active" ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Activate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteFunnel.mutate(f.id)}>
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

      <FunnelDetailsDrawer
        funnel={selectedFunnel}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedFunnel(null); }}
      />
    </DashboardLayout>
  );
};

export default DashboardFunnels;
