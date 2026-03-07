import { VARIABLE_OPTIONS, AUTOMATION_LINKS, CRM_DATA } from "./editorConstants";

const ALL_VARIABLES = [...VARIABLE_OPTIONS, ...AUTOMATION_LINKS, ...CRM_DATA];

// Deduplicate by value
const UNIQUE_VARIABLES = ALL_VARIABLES.filter(
  (v, i, arr) => arr.findIndex((x) => x.value === v.value) === i
);

interface VariableAutocompleteProps {
  filter: string;
  position: { top: number; left: number };
  onSelect: (value: string) => void;
}

export default function VariableAutocomplete({ filter, position, onSelect }: VariableAutocompleteProps) {
  const matches = UNIQUE_VARIABLES.filter((v) =>
    v.value.toLowerCase().includes(filter.toLowerCase()) ||
    v.label.toLowerCase().includes(filter.toLowerCase())
  );

  if (matches.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-popover border border-border rounded-md shadow-lg py-1 max-h-48 overflow-y-auto w-56"
      style={{ top: position.top, left: position.left }}
    >
      {matches.map((v) => (
        <button
          key={v.value}
          type="button"
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(v.value);
          }}
        >
          <span className="text-foreground">{v.label}</span>
          <span className="text-muted-foreground font-mono text-xs">{v.value}</span>
        </button>
      ))}
    </div>
  );
}
