import type { FieldCondition, FormField, VisibilityRule } from "@/hooks/useForms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OPERATOR_LABELS, OPERATOR_NEEDS_VALUE } from "@/lib/forms/conditions";

interface Props {
  field: FormField;
  otherFields: { name: string; label: string }[];
  onChange: (rule: VisibilityRule | undefined) => void;
}

export default function ConditionalLogicEditor({ field, otherFields, onChange }: Props) {
  const rule = field.visible_when;
  const enabled = Boolean(rule);

  const setRule = (next: VisibilityRule) => onChange(next);

  const toggle = (on: boolean) => {
    if (!on) return onChange(undefined);
    onChange({
      match: "all",
      conditions: [
        { field: otherFields[0]?.name ?? "", operator: "equals", value: "" },
      ],
    });
  };

  const updateCondition = (i: number, patch: Partial<FieldCondition>) => {
    if (!rule) return;
    const conditions = rule.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setRule({ ...rule, conditions });
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">Conditional logic</Label>
          <p className="text-[11px] text-muted-foreground">Show this field only when rules match.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={otherFields.length === 0} />
      </div>

      {otherFields.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Add another field first to build a rule.
        </p>
      )}

      {enabled && rule && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Match</span>
            <Select
              value={rule.match}
              onValueChange={(v) => setRule({ ...rule, match: v as "all" | "any" })}
            >
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rules</SelectItem>
                <SelectItem value="any">Any rule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rule.conditions.map((c, i) => (
            <div key={i} className="space-y-1.5 rounded-md border bg-muted/30 p-2">
              <div className="flex items-center gap-1.5">
                <Select value={c.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                  <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                  <SelectContent>
                    {otherFields.map((f) => (
                      <SelectItem key={f.name} value={f.name}>{f.label || f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    const conditions = rule.conditions.filter((_, idx) => idx !== i);
                    if (conditions.length === 0) return onChange(undefined);
                    setRule({ ...rule, conditions });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Select
                  value={c.operator}
                  onValueChange={(v) => updateCondition(i, { operator: v as FieldCondition["operator"] })}
                >
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATOR_LABELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {OPERATOR_NEEDS_VALUE(c.operator) && (
                  <Input
                    className="h-8 flex-1 text-xs"
                    value={c.value ?? ""}
                    placeholder="Value"
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                  />
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              setRule({
                ...rule,
                conditions: [
                  ...rule.conditions,
                  { field: otherFields[0]?.name ?? "", operator: "equals", value: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add rule
          </Button>
        </div>
      )}
    </div>
  );
}
