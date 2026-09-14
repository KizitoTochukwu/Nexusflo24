import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FormInput, Plus, MoreHorizontal, ExternalLink, Code2, Copy, Trash2, Pencil, Sparkles,
} from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useForms, useCreateForm, useDeleteForm, useUpdateForm, type FormRecord,
} from "@/hooks/useForms";
import EmbedFormDialog from "@/components/forms/EmbedFormDialog";
import AiFormDialog from "@/components/forms/AiFormDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DashboardForms() {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { data: forms, isLoading } = useForms(workspaceId);
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const [newName, setNewName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a form name");
      return;
    }
    const created = await createForm.mutateAsync({
      workspace_id: workspaceId,
      name: newName.trim(),
    });
    setNewName("");
    setCreateOpen(false);
    navigate(`/dashboard/${workspaceId}/forms/${created.id}`);
  };

  const handleDuplicate = async (f: FormRecord) => {
    const created = await createForm.mutateAsync({
      workspace_id: workspaceId,
      name: `${f.name} (copy)`,
    });
    await updateForm.mutateAsync({
      id: created.id,
      schema: f.schema as any,
      settings: f.settings as any,
      theme: f.theme as any,
      description: f.description,
    });
    toast.success("Form duplicated");
  };

  const copyHostedLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}`);
    toast.success("Public link copied");
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage lead capture forms. Embed them on any site or share the hosted link.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setAiOpen(true)}>
          <Sparkles className="mr-1.5 h-4 w-4 text-accent" /> Generate with AI
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> New form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create a new form</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="Form name (e.g. Newsletter signup)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createForm.isPending}>Create & open</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <AiFormDialog workspaceId={workspaceId} open={aiOpen} onOpenChange={setAiOpen} />


      {isLoading ? (
        <div className="mt-10 text-center text-muted-foreground">Loading forms…</div>
      ) : !forms?.length ? (
        <div className="mt-6 rounded-xl border bg-card p-12 text-center">
          <FormInput className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">No forms yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your first lead-capture form in minutes.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Create your first form
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Card key={f.id} className="group cursor-pointer transition hover:shadow-md" onClick={() => navigate(`/dashboard/${workspaceId}/forms/${f.id}`)}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{f.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      f.status === "active"
                        ? "mt-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "mt-1.5"
                    }
                  >
                    {f.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/forms/${f.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyHostedLink(f.slug)}>
                      <Copy className="mr-2 h-4 w-4" /> Copy public link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/forms/${f.slug}`, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Open public page
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(f)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this form?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete “{f.name}” and break any sites embedding it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteForm.mutate({ id: f.id, workspace_id: workspaceId })}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.submission_count} submissions</span>
                  <span>Updated {format(new Date(f.updated_at), "MMM d")}</span>
                </div>
                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <EmbedFormDialog
                    form={f}
                    trigger={
                      <Button size="sm" variant="outline" className="flex-1">
                        <Code2 className="mr-1.5 h-3.5 w-3.5" /> Embed
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/forms/${f.slug}`, "_blank")}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
