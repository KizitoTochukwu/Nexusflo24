// Reusable AND/OR filter builder used by the enrollment trigger drawer.
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OPERATORS } from "@/lib/workflows/triggerCatalog";

export interface FilterCondition {
  property: string;
  operator: string;
  value?: string;
}

export interface FilterGroup {
  combinator: "AND" | "OR";
  conditions: FilterCondition[];
}

interface Props {
  value: FilterGroup[];
  onChange: (groups: FilterGroup[]) => void;
  propertySuggestions?: string[];
}

export default function FilterGroupBuilder({ value, onChange, propertySuggestions = [] }: Props) {
  const groups = value.length ? value : [];

  const addGroup = () => onChange([...groups, { combinator: "AND", conditions: [{ property: "", operator: "eq", value: "" }] }]);
  const removeGroup = (gi: number) => onChange(groups.filter((_, i) => i !== gi));

  const updateGroup = (gi: number, patch: Partial<FilterGroup>) =>
    onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

  const addCondition = (gi: number) =>
    updateGroup(gi, { conditions: [...groups[gi].conditions, { property: "", operator: "eq", value: "" }] });

  const removeCondition = (gi: number, ci: number) =>
    updateGroup(gi, { conditions: groups[gi].conditions.filter((_, i) => i !== ci) });

  const updateCondition = (gi: number, ci: number, patch: Partial<FilterCondition>) =>
    updateGroup(gi, {
      conditions: groups[gi].conditions.map((c, i) => (i === ci ? { ...c, ...patch } : c)),
    });

  return (
    <div className="space-y-3">
      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No additional filters. All matching events will enrol.</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Group {gi + 1}</span>
              <span className="text-muted-foreground/50">·</span>
              <select
                value={group.combinator}
                onChange={(e) => updateGroup(gi, { combinator: e.target.value as "AND" | "OR" })}
                className="rounded border bg-background px-1.5 py-0.5 text-[11px] font-semibold"
              >
                <option value="AND">match ALL</option>
                <option value="OR">match ANY</option>
              </select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeGroup(gi)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {group.conditions.map((c, ci) => {
            const op = OPERATORS.find((o) => o.key === c.operator);
            return (
              <div key={ci} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <Input
                  list={`props-${gi}-${ci}`}
                  placeholder="property e.g. email"
                  value={c.property}
                  onChange={(e) => updateCondition(gi, ci, { property: e.target.value })}
                  className="h-8"
                />
                {propertySuggestions.length > 0 && (
                  <datalist id={`props-${gi}-${ci}`}>
                    {propertySuggestions.map((p) => <option key={p} value={p} />)}
                  </datalist>
                )}
                <select
                  value={c.operator}
                  onChange={(e) => updateCondition(gi, ci, { operator: e.target.value })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {OPERATORS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {op?.noValue ? (
                  <div className="text-xs text-muted-foreground italic">no value needed</div>
                ) : (
                  <Input
                    placeholder="value"
                    value={c.value || ""}
                    onChange={(e) => updateCondition(gi, ci, { value: e.target.value })}
                    className="h-8"
                  />
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCondition(gi, ci)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          <Button variant="ghost" size="sm" onClick={() => addCondition(gi)} className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" /> Add AND condition
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addGroup} className="w-full">
        <Plus className="mr-1 h-3.5 w-3.5" /> Add OR group
      </Button>
    </div>
  );
}
