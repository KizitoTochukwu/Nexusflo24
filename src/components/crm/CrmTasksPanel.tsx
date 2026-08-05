import { useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import {
  useCrmTasks, useToggleTaskDone, useDeleteTask, type CrmTask, type TaskLink,
} from "@/hooks/useCrmTasks";
import TaskCreateDrawer from "@/components/crm/TaskCreateDrawer";

export const priorityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/10 text-accent-foreground border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
};

export const TaskRow = ({
  task, canEdit, onEdit,
}: { task: CrmTask; canEdit: boolean; onEdit?: (t: CrmTask) => void }) => {
  const toggle = useToggleTaskDone();
  const del = useDeleteTask();
  const overdue = task.status !== "done" && task.due_date && isPast(new Date(task.due_date));

  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Checkbox
        checked={task.status === "done"}
        disabled={!canEdit}
        onCheckedChange={() => toggle(task)}
        aria-label={`Mark ${task.title} as ${task.status === "done" ? "open" : "done"}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => canEdit && onEdit?.(task)}
          className={`block truncate text-left text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={priorityStyles[task.priority] ?? priorityStyles.low}>
            {task.priority}
          </Badge>
          <span className="capitalize">{task.task_type?.replace("_", " ")}</span>
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-destructive" : ""}`}>
              <CalendarClock className="h-3 w-3" />
              {format(new Date(task.due_date), "d MMM yyyy, HH:mm")}
            </span>
          )}
        </div>
        {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      </div>
      {canEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => del.mutate(task.id)} aria-label="Delete task">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </li>
  );
};

/** Embeddable task list for a contact, company, deal or lead record. */
const CrmTasksPanel = ({
  workspaceId, link, canEdit,
}: { workspaceId: string; link: TaskLink; canEdit: boolean }) => {
  const { data: tasks = [], isLoading } = useCrmTasks(workspaceId, {}, link);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmTask | null>(null);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => Number(a.status === "done") - Number(b.status === "done")),
    [tasks],
  );

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <TaskRow key={t.id} task={t} canEdit={canEdit} onEdit={(task) => { setEditing(task); setOpen(true); }} />
          ))}
        </ul>
      )}

      <TaskCreateDrawer open={open} onOpenChange={setOpen} workspaceId={workspaceId} link={link} task={editing} />
    </div>
  );
};

export default CrmTasksPanel;
