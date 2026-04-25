import type { FormField } from "@/hooks/useForms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  field: FormField;
  onChange: (next: FormField) => void;
}

const HAS_OPTIONS = new Set(["select", "radio", "checkbox_group"]);
const HAS_PLACEHOLDER = new Set(["short_text", "long_text", "email", "phone", "number", "select"]);

export default function FieldPropertiesPanel({ field, onChange }: Props) {
  const update = <K extends keyof FormField>(k: K, v: FormField[K]) =>
    onChange({ ...field, [k]: v });

  const updateOption = (i: number, key: "label" | "value", val: string) => {
    const opts = [...(field.options ?? [])];
    opts[i] = { ...opts[i], [key]: val };
    update("options", opts);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Label</Label>
        <Input value={field.label ?? ""} onChange={(e) => update("label", e.target.value)} />
      </div>

      {field.type !== "heading" && field.type !== "paragraph" && field.type !== "divider" && (
        <div>
          <Label className="text-xs">Field name (key)</Label>
          <Input
            value={field.name ?? ""}
            onChange={(e) => update("name", e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
          />
          <p className="mt-1 text-xs text-muted-foreground">Used as the data key.</p>
        </div>
      )}

      {HAS_PLACEHOLDER.has(field.type) && (
        <div>
          <Label className="text-xs">Placeholder</Label>
          <Input value={field.placeholder ?? ""} onChange={(e) => update("placeholder", e.target.value)} />
        </div>
      )}

      {field.type !== "heading" && field.type !== "paragraph" && field.type !== "divider" && field.type !== "hidden" && (
        <div>
          <Label className="text-xs">Help text</Label>
          <Textarea
            rows={2}
            value={field.help_text ?? ""}
            onChange={(e) => update("help_text", e.target.value)}
          />
        </div>
      )}

      {field.type === "hidden" && (
        <div>
          <Label className="text-xs">Default value</Label>
          <Input value={field.default_value ?? ""} onChange={(e) => update("default_value", e.target.value)} />
        </div>
      )}

      {!["heading", "paragraph", "divider", "hidden"].includes(field.type) && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <Label className="text-sm">Required</Label>
            <p className="text-xs text-muted-foreground">User must complete this field.</p>
          </div>
          <Switch checked={!!field.required} onCheckedChange={(v) => update("required", v)} />
        </div>
      )}

      {!["heading", "paragraph", "divider"].includes(field.type) && (
        <div>
          <Label className="text-xs">Map to lead field</Label>
          <Select
            value={field.map_to ?? "meta"}
            onValueChange={(v) => update("map_to", v as FormField["map_to"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_name">Full name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
              <SelectItem value="meta">Custom (meta)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {HAS_OPTIONS.has(field.type) && (
        <div>
          <Label className="text-xs">Options</Label>
          <div className="space-y-2">
            {(field.options ?? []).map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={o.label}
                  onChange={(e) => updateOption(i, "label", e.target.value)}
                />
                <Input
                  placeholder="value"
                  value={o.value}
                  onChange={(e) => updateOption(i, "value", e.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive"
                  onClick={() => {
                    const opts = [...(field.options ?? [])];
                    opts.splice(i, 1);
                    update("options", opts);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update("options", [
                  ...(field.options ?? []),
                  { label: `Option ${(field.options?.length ?? 0) + 1}`, value: `option_${(field.options?.length ?? 0) + 1}` },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add option
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
