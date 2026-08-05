import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal } from "lucide-react";
import {
  useCustomFieldDefs,
  useCustomFieldValues,
  useSaveCustomFieldValues,
  type CrmRecordType,
} from "@/hooks/useCrmCustomFields";

type Props = {
  workspaceId: string;
  recordType: CrmRecordType;
  recordId: string;
  canEdit?: boolean;
};

const CustomFieldsPanel = ({ workspaceId, recordType, recordId, canEdit = true }: Props) => {
  const { data: defs = [], isLoading } = useCustomFieldDefs(workspaceId, recordType, true);
  const { data: values } = useCustomFieldValues(workspaceId, recordType, recordId);
  const save = useSaveCustomFieldValues();
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setForm(values ?? {});
  }, [values, recordId]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (!defs.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No custom fields yet</p>
          <p className="text-xs text-muted-foreground">
            Workspace admins can add custom fields in CRM Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const set = (id: string, v: unknown) => setForm((f) => ({ ...f, [id]: v }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((def) => {
          const v = form[def.id];
          return (
            <div key={def.id} className="space-y-1.5">
              <Label htmlFor={`cf-${def.id}`} className="text-xs">
                {def.label}
                {def.is_required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              {def.field_type === "textarea" ? (
                <Textarea
                  id={`cf-${def.id}`}
                  value={(v as string) ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => set(def.id, e.target.value)}
                />
              ) : def.field_type === "select" ? (
                <Select value={(v as string) ?? ""} onValueChange={(val) => set(def.id, val)} disabled={!canEdit}>
                  <SelectTrigger id={`cf-${def.id}`}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {def.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : def.field_type === "checkbox" ? (
                <div className="flex h-10 items-center">
                  <Checkbox
                    id={`cf-${def.id}`}
                    checked={!!v}
                    disabled={!canEdit}
                    onCheckedChange={(c) => set(def.id, !!c)}
                  />
                </div>
              ) : (
                <Input
                  id={`cf-${def.id}`}
                  type={def.field_type === "number" ? "number" : def.field_type === "date" ? "date" : "text"}
                  value={(v as string) ?? ""}
                  disabled={!canEdit}
                  onChange={(e) =>
                    set(def.id, def.field_type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
                  }
                />
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({ workspace_id: workspaceId, record_type: recordType, record_id: recordId, values: form })
          }
        >
          {save.isPending ? "Saving…" : "Save custom fields"}
        </Button>
      )}
    </div>
  );
};

export default CustomFieldsPanel;
