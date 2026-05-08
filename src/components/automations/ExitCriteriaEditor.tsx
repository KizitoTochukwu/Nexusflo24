import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Sparkles } from "lucide-react";
import {
  EXIT_CRITERION_TYPES,
  type ExitCriterion,
  getDefaultExitCriteria,
} from "@/lib/automations/exitCriteria";
import { AUTOMATION_TAG_OPTIONS } from "@/lib/automations/tagOptions";

const PIPELINE_STAGES = ["New", "Contacted", "Engaged", "Qualified", "Warm", "Hot", "Won", "Customer", "Lost"];

interface Props {
  value: ExitCriterion[];
  onChange: (value: ExitCriterion[]) => void;
  triggerType: string;
}

export default function ExitCriteriaEditor({ value, onChange, triggerType }: Props) {
  const defaults = getDefaultExitCriteria(triggerType);
  const hasDefaults = defaults.length > 0;

  const add = (type: ExitCriterion["type"]) => {
    let newCrit: ExitCriterion;
    if (type === "tag_added") newCrit = { type, tag: "" };
    else if (type === "status_equals") newCrit = { type, status: "Won" };
    else newCrit = { type } as ExitCriterion;
    onChange([...value, newCrit]);
  };

  const update = (idx: number, patch: Partial<ExitCriterion>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch } as ExitCriterion;
    onChange(next);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const restoreDefaults = () => onChange(defaults);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 space-y-2">
      {/* Exit criteria label hidden — logic remains fully functional */}
      {hasDefaults && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-100"
            onClick={restoreDefaults}
          >
            <Sparkles className="h-3 w-3" /> Use suggested defaults
          </Button>
        </div>
      )}
      <p className="text-xs text-rose-800/80">
        Stop this automation early for a lead when any of these happen — useful for nurture flows so customers don't keep getting "convince you to buy" messages after they've purchased.
      </p>

      {value.length === 0 && (
        <div className="rounded-md border border-dashed border-rose-300 bg-background/60 p-3 text-center text-xs text-muted-foreground">
          No exit criteria. The automation will run to completion regardless of what the lead does.
        </div>
      )}

      <div className="space-y-1.5">
        {value.map((c, i) => {
          const meta = EXIT_CRITERION_TYPES.find((t) => t.value === c.type);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2">
              <Select value={c.type} onValueChange={(v) => {
                const t = v as ExitCriterion["type"];
                if (t === "tag_added") update(i, { type: t, tag: "" } as any);
                else if (t === "status_equals") update(i, { type: t, status: "Won" } as any);
                else update(i, { type: t } as any);
              }}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXIT_CRITERION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {meta?.needsValue === "tag" && (
                <Select
                  value={(c as Extract<ExitCriterion, { type: "tag_added" }>).tag}
                  onValueChange={(v) => update(i, { tag: v } as any)}
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TAG_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {meta?.needsValue === "status" && (
                <Select
                  value={(c as Extract<ExitCriterion, { type: "status_equals" }>).status}
                  onValueChange={(v) => update(i, { status: v } as any)}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <span className="text-[11px] text-muted-foreground flex-1 truncate">
                {meta?.description}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {EXIT_CRITERION_TYPES
          .filter((t) => !value.some((c) => c.type === t.value && !t.needsValue))
          .map((t) => (
            <Button
              key={t.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 bg-background text-xs"
              onClick={() => add(t.value)}
            >
              <Plus className="h-3 w-3" /> {t.label}
            </Button>
          ))}
      </div>
    </div>
  );
}
