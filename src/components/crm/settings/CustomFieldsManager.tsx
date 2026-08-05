import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import {
  useCustomFieldDefs, useUpsertCustomFieldDef, useDeleteCustomFieldDef,
  FIELD_TYPES, slugifyFieldKey, type CrmCustomFieldDef, type CrmRecordType, type CustomFieldType,
} from "@/hooks/useCrmCustomFields";

const RECORD_TYPES: { value: CrmRecordType; label: string }[] = [
  { value: "contact", label: "Contacts" },
  { value: "company", label: "Companies" },
  { value: "deal", label: "Deals" },
];

const emptyForm = {
  label: "",
  field_type: "text" as CustomFieldType,
  optionsText: "",
  is_required: false,
  is_active: true,
  sort_order: 0,
};

const CustomFieldsManager = ({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) => {
  const [recordType, setRecordType] = useState<CrmRecordType>("contact");
  const { data: defs = [], isLoading } = useCustomFieldDefs(workspaceId, recordType);
  const upsert = useUpsertCustomFieldDef();
  const remove = useDeleteCustomFieldDef();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmCustomFieldDef | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CrmCustomFieldDef | null>(null);

  const previewKey = useMemo(
    () => editing?.field_key ?? (form.label ? slugifyFieldKey(form.label) : ""),
    [form.label, editing],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: defs.length });
    setOpen(true);
  };

  const openEdit = (def: CrmCustomFieldDef) => {
    setEditing(def);
    setForm({
      label: def.label,
      field_type: def.field_type,
      optionsText: (def.options ?? []).join("\n"),
      is_required: def.is_required,
      is_active: def.is_active,
      sort_order: def.sort_order,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.label.trim()) return;
    await upsert.mutateAsync({
      id: editing?.id,
      workspace_id: workspaceId,
      record_type: recordType,
      field_key: editing?.field_key,
      label: form.label.trim(),
      field_type: form.field_type,
      options:
        form.field_type === "select"
          ? form.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
      is_required: form.is_required,
      is_active: form.is_active,
      sort_order: form.sort_order,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Custom fields</h2>
          <p className="text-xs text-muted-foreground">
            Capture the data unique to your business on contacts, companies and deals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={recordType} onValueChange={(v) => setRecordType(v as CrmRecordType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECORD_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New field
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : defs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No custom fields for {recordType}s yet</p>
              <p className="text-xs text-muted-foreground">Add one to start tracking your own data points.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead className="hidden md:table-cell">Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-[90px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {defs.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell className="font-medium">
                      {def.label}
                      {def.is_required && <span className="ml-1 text-xs text-destructive">required</span>}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {def.field_key}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {FIELD_TYPES.find((f) => f.value === def.field_type)?.label ?? def.field_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={def.is_active ? "secondary" : "outline"}>
                        {def.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(def)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTarget(def)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full space-y-4 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit custom field" : "New custom field"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">Label</Label>
            <Input id="cf-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            {previewKey && <p className="font-mono text-[11px] text-muted-foreground">key: {previewKey}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Field type</Label>
            <Select
              value={form.field_type}
              onValueChange={(v) => setForm((f) => ({ ...f, field_type: v as CustomFieldType }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.field_type === "select" && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-options">Options (one per line)</Label>
              <textarea
                id="cf-options"
                className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
                value={form.optionsText}
                onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">Mark this field as mandatory in the UI</p>
            </div>
            <Switch checked={form.is_required} onCheckedChange={(c) => setForm((f) => ({ ...f, is_required: c }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Hidden fields stay saved but don't show on records</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} />
          </div>
          <Button className="w-full" disabled={!form.label.trim() || upsert.isPending} onClick={submit}>
            {upsert.isPending ? "Saving…" : "Save field"}
          </Button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the field and every value stored against it on your records.
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

export default CustomFieldsManager;
