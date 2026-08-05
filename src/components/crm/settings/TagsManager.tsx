import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { useCrmTags, useTagUsage, useUpsertCrmTag, useDeleteCrmTag, type CrmTag } from "@/hooks/useCrmTags";

const PRESET_COLORS = ["#C9A227", "#0B1F3B", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#F97316", "#64748B"];

const TagsManager = ({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) => {
  const { data: tags = [], isLoading } = useCrmTags(workspaceId);
  const { data: usage = {} } = useTagUsage(workspaceId);
  const upsert = useUpsertCrmTag();
  const remove = useDeleteCrmTag();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmTag | null>(null);
  const [form, setForm] = useState({ name: "", color: PRESET_COLORS[0], description: "" });
  const [deleteTarget, setDeleteTarget] = useState<CrmTag | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", color: PRESET_COLORS[0], description: "" });
    setOpen(true);
  };

  const openEdit = (tag: CrmTag) => {
    setEditing(tag);
    setForm({ name: tag.name, color: tag.color, description: tag.description ?? "" });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync({
      id: editing?.id,
      workspace_id: workspaceId,
      name: form.name,
      color: form.color,
      description: form.description || null,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Tags</h2>
          <p className="text-xs text-muted-foreground">
            Shared labels for segmenting contacts across the CRM and campaigns.
          </p>
        </div>
        {canManage && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New tag
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : tags.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <TagIcon className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No tags yet</p>
            <p className="text-xs text-muted-foreground">Create tags like “VIP”, “Newsletter” or “Churn risk”.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id} className="group">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    className="border-0 text-xs"
                    style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                  {canManage && (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tag)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(tag)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {tag.description && <p className="text-xs text-muted-foreground">{tag.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {usage[tag.name] ?? 0} contact{(usage[tag.name] ?? 0) === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full space-y-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit tag" : "New tag"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Name</Label>
            <Input id="tag-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-desc">Description</Label>
            <Input
              id="tag-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    form.color === c ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={!form.name.trim() || upsert.isPending} onClick={submit}>
            {upsert.isPending ? "Saving…" : "Save tag"}
          </Button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The tag is removed from the shared library. Contacts already labelled keep the text value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) remove.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagsManager;
