import { FIELD_DEFS, newFieldId } from "./fieldDefs";
import type { FormField } from "@/hooks/useForms";

interface Props {
  onAdd: (field: FormField) => void;
}

export default function FieldLibrary({ onAdd }: Props) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Add field
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELD_DEFS.map((def) => {
          const Icon = def.icon;
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => onAdd({ ...def.defaults(), id: newFieldId() } as FormField)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background p-3 text-xs hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-center leading-tight">{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
