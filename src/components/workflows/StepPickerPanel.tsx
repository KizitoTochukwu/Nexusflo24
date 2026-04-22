import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Database, MessageCircle, Globe, Workflow as WorkflowIcon, FunctionSquare, Filter, Calendar, MousePointer2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRIGGERS, ACTIONS, CONDITIONS, FLOW_NODES, type PaletteItem } from "@/lib/workflows/nodeLibrary";
import { cn } from "@/lib/utils";

type Mode = "trigger" | "step";

interface CategoryDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** tailwind classes for the colored circular icon chip */
  chip: string;
  /** match palette item.group values */
  groups: string[];
}

// HubSpot-style colored category groups
const TRIGGER_CATEGORIES: CategoryDef[] = [
  { id: "data", label: "Data values", icon: Database, chip: "bg-emerald-100 text-emerald-700 ring-emerald-200", groups: ["Lead", "Scoring"] },
  { id: "comms", label: "Emails, calls & communication", icon: MessageCircle, chip: "bg-orange-100 text-orange-700 ring-orange-200", groups: ["Engagement", "Messaging"] },
  { id: "web", label: "Websites & media", icon: Globe, chip: "bg-violet-100 text-violet-700 ring-violet-200", groups: ["Capture"] },
  { id: "automation", label: "Automations triggered", icon: WorkflowIcon, chip: "bg-sky-100 text-sky-700 ring-sky-200", groups: ["Campaigns", "Lifecycle"] },
  { id: "sales", label: "Sales & revenue", icon: FunctionSquare, chip: "bg-amber-100 text-amber-700 ring-amber-200", groups: ["Sales"] },
];

const STEP_CATEGORIES: CategoryDef[] = [
  { id: "comms", label: "Send communications", icon: MessageCircle, chip: "bg-orange-100 text-orange-700 ring-orange-200", groups: ["Messaging"] },
  { id: "crm", label: "CRM & data updates", icon: Database, chip: "bg-emerald-100 text-emerald-700 ring-emerald-200", groups: ["CRM", "Scoring", "Internal"] },
  { id: "timing", label: "Timing & delays", icon: Calendar, chip: "bg-sky-100 text-sky-700 ring-sky-200", groups: ["Timing"] },
  { id: "logic", label: "If/then branches", icon: Filter, chip: "bg-violet-100 text-violet-700 ring-violet-200", groups: ["Engagement", "CRM", "Sales", "Custom", "Scoring"] },
  { id: "flow", label: "Flow control", icon: WorkflowIcon, chip: "bg-amber-100 text-amber-700 ring-amber-200", groups: ["Flow", "Integration"] },
];

interface Props {
  mode?: Mode;
  onAdd: (item: PaletteItem) => void;
}

export default function StepPickerPanel({ mode = "trigger", onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({ data: true, comms: true });

  const categories = mode === "trigger" ? TRIGGER_CATEGORIES : STEP_CATEGORIES;

  // Build the pool of items per mode
  const pool = useMemo<PaletteItem[]>(() => {
    if (mode === "trigger") return TRIGGERS;
    return [...ACTIONS, ...CONDITIONS, ...FLOW_NODES];
  }, [mode]);

  // Filter by search across label, description, group, subType
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        i.subType.toLowerCase().includes(q)
    );
  }, [pool, query]);

  // Group items by category
  const grouped = useMemo(() => {
    const map: Record<string, PaletteItem[]> = {};
    const used = new Set<string>();
    for (const cat of categories) {
      const items = filtered.filter((i) => cat.groups.includes(i.group));
      items.forEach((i) => used.add(i.subType));
      if (items.length) map[cat.id] = items;
    }
    // Bucket anything that didn't match a known group
    const other = filtered.filter((i) => !used.has(i.subType));
    if (other.length) map.__other = other;
    return map;
  }, [filtered, categories]);

  const toggle = (id: string) => setOpenCats((s) => ({ ...s, [id]: !s[id] }));

  // When searching, expand all categories that have results
  const isOpen = (id: string) => (query.trim() ? true : !!openCats[id]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {mode === "trigger" ? "Triggers" : "Add a step"}
          </h3>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "trigger" ? "Search triggers, properties…" : "Search actions, conditions…"}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {mode === "trigger" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: "Trigger manually", icon: MousePointer2 },
              { label: "Met filter criteria", icon: Filter },
              { label: "On a schedule", icon: Calendar },
            ].map((c) => (
              <button
                key={c.label}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
                onClick={() => setQuery(c.label.split(" ")[0])}
              >
                <c.icon className="h-3 w-3" /> {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {categories.map((cat) => {
            const items = grouped[cat.id];
            if (!items || !items.length) return null;
            const open = isOpen(cat.id);
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="mb-1">
                <button
                  onClick={() => toggle(cat.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/60"
                >
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full ring-1",
                      cat.chip
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </button>

                {open && (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l pl-2">
                    {items.map((it) => (
                      <button
                        key={it.subType}
                        onClick={() => onAdd(it)}
                        className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/10"
                        title={it.description}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1",
                            cat.chip
                          )}
                        >
                          <it.icon className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {it.label}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {it.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {grouped.__other && (
            <div className="mb-1">
              <button
                onClick={() => toggle("__other")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/60"
              >
                {isOpen("__other") ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  <FunctionSquare className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 truncate">Other</span>
                <span className="text-[10px] text-muted-foreground">{grouped.__other.length}</span>
              </button>
              {isOpen("__other") && (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l pl-2">
                  {grouped.__other.map((it) => (
                    <button
                      key={it.subType}
                      onClick={() => onAdd(it)}
                      className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/10"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                        <it.icon className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">{it.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{it.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {Object.keys(grouped).length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No matches for "{query}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
