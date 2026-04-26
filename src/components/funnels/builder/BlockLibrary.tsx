import {
  LayoutTemplate, Columns2, Columns3, Columns4, Type, AlignLeft, ImageIcon,
  MousePointerClick, Minus, MoveVertical, FormInput, Quote,
  DollarSign, HelpCircle, Code, Video, CalendarDays, LayoutGrid,
} from "lucide-react";
import { BlockType, BLOCK_LABELS } from "./blockTypes";

const ICONS: Record<string, React.ElementType> = {
  LayoutTemplate, Columns2, Columns3, Columns4, Type, AlignLeft, ImageIcon,
  MousePointerClick, Minus, MoveVertical, FormInput, Quote,
  DollarSign, HelpCircle, Code, Video, CalendarDays, LayoutGrid,
};

const GROUPS = [
  { label: "Layout", types: ["section", "columns2", "columns3", "columns4", "divider", "spacer"] as BlockType[] },
  { label: "Content", types: ["heading", "text", "image", "button"] as BlockType[] },
  { label: "Conversion", types: ["form", "testimonials", "pricing", "faq", "cards", "booking"] as BlockType[] },
  { label: "Advanced", types: ["embed", "video"] as BlockType[] },
];

interface Props {
  onAdd: (type: BlockType) => void;
}

export default function BlockLibrary({ onAdd }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Blocks</h3>
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground px-1">{g.label}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {g.types.map((type) => {
              const meta = BLOCK_LABELS[type];
              const Icon = ICONS[meta.icon] || LayoutTemplate;
              return (
                <button
                  key={type}
                  onClick={() => onAdd(type)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
