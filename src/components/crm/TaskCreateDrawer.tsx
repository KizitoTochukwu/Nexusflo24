import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useCreateTask, useUpdateTask, type CrmTask, type TaskLink } from "@/hooks/useCrmTasks";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  link?: TaskLink;
  task?: CrmTask | null;
};

const TaskCreateDrawer = ({ open, onOpenChange, workspaceId, link, task }: Props) => {
  const create = useCreateTask();
  const update = useUpdateTask();
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [taskType, setTaskType] = useState("todo");
  const [status, setStatus] = useState("open");
  const [assignedTo, setAssignedTo] = useState("unassigned");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "");
    setPriority(task?.priority ?? "medium");
    setTaskType(task?.task_type ?? "todo");
    setStatus(task?.status ?? "open");
    setAssignedTo(task?.assigned_to ?? "unassigned");
  }, [open, task]);

  const submit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      task_type: taskType,
      status,
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
    };
    if (task) {
      await update.mutateAsync({ id: task.id, ...payload });
    } else {
      await create.mutateAsync({ workspace_id: workspaceId, ...payload, ...(link ?? {}) } as any);
    }
    onOpenChange(false);
  };

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{task ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>Track follow-ups so nothing slips through the pipeline.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Call back about proposal" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["todo", "call", "email", "meeting", "follow_up"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due</Label>
              <Input id="task-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(members as any[]).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || "Member"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Notes</Label>
            <Textarea id="task-desc" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim() || pending}>
              {pending ? "Saving…" : task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskCreateDrawer;
