import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks, Plus, Search, AlarmClock, CheckCircle2, CalendarDays, Download } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useCrmTasks, useTaskStats, type CrmTask, type TaskFilters } from "@/hooks/useCrmTasks";
import { TaskRow } from "@/components/crm/CrmTasksPanel";
import TaskCreateDrawer from "@/components/crm/TaskCreateDrawer";
import { exportRowsToCsv } from "@/lib/crm/csv";

const DashboardTasks = () => {
  const workspaceId = useWorkspaceId();
  const { canEdit } = useWorkspaceRole();
  const [filters, setFilters] = useState<TaskFilters>({ status: "all", priority: "all", assigned_to: "all" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmTask | null>(null);

  const { data: tasks = [], isLoading } = useCrmTasks(workspaceId, filters);
  const stats = useTaskStats(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const cards = [
    { label: "Open tasks", value: stats.open, icon: ListChecks },
    { label: "Overdue", value: stats.overdue, icon: AlarmClock },
    { label: "Due today", value: stats.dueToday, icon: CalendarDays },
    { label: "Completed", value: stats.completed, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <Seo title="CRM Tasks | NexusFlo24" description="Track follow-ups, calls and meetings across your CRM records." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Every follow-up across contacts, companies and deals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!tasks.length}
            onClick={() =>
              exportRowsToCsv("tasks", tasks, [
                { key: "title", label: "Title" },
                { key: "status", label: "Status" },
                { key: "priority", label: "Priority" },
                { key: "task_type", label: "Type" },
                { key: "due_date", label: "Due date" },
                { key: "completed_at", label: "Completed at" },
                { key: "created_at", label: "Created" },
              ])
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {canEdit && (
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New task
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-lg bg-accent/10 p-2"><c.icon className="h-5 w-5 text-accent" /></span>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-semibold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tasks…"
                value={filters.search ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.due ?? "any"} onValueChange={(v) => setFilters((f) => ({ ...f, due: v === "any" ? undefined : v }))}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Due" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any due date</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="week">Next 7 days</SelectItem>
                <SelectItem value="none">No due date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.assigned_to} onValueChange={(v) => setFilters((f) => ({ ...f, assigned_to: v }))}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {(members as any[]).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || "Member"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No tasks match these filters.
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} canEdit={canEdit} onEdit={(task) => { setEditing(task); setOpen(true); }} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TaskCreateDrawer open={open} onOpenChange={setOpen} workspaceId={workspaceId} task={editing} />
    </div>
  );
};

export default DashboardTasks;
