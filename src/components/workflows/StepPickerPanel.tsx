// HubSpot-style left panel: search + quick chips + collapsible categorized rows.
// Used both for picking the initial trigger and for inserting actions/conditions
// when the user clicks the "+" between two nodes on the canvas.

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Clock, Filter, MousePointerClick } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TRIGGERS,
  ACTIONS,
  CONDITIONS,
  CATEGORY_META,
  type PaletteItem,
  type NodeCategory,
} from "@/lib/workflows/nodeLibrary";

export type PickerMode = "trigger" | "step";

interface Props {
  mode: PickerMode;
  /** Header label, e.g. "Triggers" or "Add a step" */
  title?: string;
  /** Called when the user picks an item from the list */
  onPick: (item: PaletteItem) => void;
  /** Optional Next button click; disabled when no eligible records */
  onNext?: () => void;
  /** Skip-trigger CTA (only meaningful in "trigger" mode) */
  onSkip?: () => void;
}

const TRIGGER_CATEGORIES: NodeCategory[] = ["data", "comms", "web", "automation", "custom"];

export default function StepPickerPanel({ mode, title, onPick, onNext, onSkip }: Props) {
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const items = useMemo<PaletteItem[]>(() => {
    if (mode === "trigger") return TRIGGERS;
    return [...ACTIONS, ...CONDITIONS];
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        it.subType.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Group by category for the categorized accordion view.
  const grouped = useMemo(() => {
    const m = new Map<NodeCategory, PaletteItem[]>();
    filtered.forEach((it) => {
      const arr = m.get(it.category) ?? [];
      arr.push(it);
      m.set(it.category, arr);
    });
    return m;
  }, [filtered]);

  const toggleCat = (key: string) =>
    setOpenCats((prev) => ({ ...prev, [key]: !prev[key] }));

  const headerLabel = title ?? (mode === "trigger" ? "Triggers" : "Add a step");

  // Quick-pick chips at the top mirror HubSpot's "Trigger manually / Met filter / On a schedule".
  const quickChips =
    mode === "trigger"
      ? [
          { label: "Trigger manually", icon: MousePointerClick, subType: "new_lead" },
          { label: "Met filter criteria", icon: Filter, subType: "lead_tagged" },
          { label: "On a schedule", icon: Clock, subType: "score_threshold" },
        ]
      : [
          { label: "Send email", icon: MousePointerClick, subType: "send_email" },
          { label: "Wait", icon: Clock, subType: "wait_delay" },
          { label: "Add tag", icon: Filter, subType: "add_tag" },
        ];

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-bold text-foreground">{headerLabel}</h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={onNext}
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-foreground">
          {mode === "trigger" ? "Choose a trigger to start this workflow" : "Choose a step to add to this workflow"}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "trigger" ? "Search triggers, forms, properties…" : "Search actions, conditions…"}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Quick chips */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {quickChips.map((chip) => {
            const target = items.find((i) => i.subType === chip.subType);
            return (
              <button
                key={chip.label}
                onClick={() => target && onPick(target)}
                className="flex flex-col items-center gap-1 rounded-md border border-border bg-background px-2 py-3 text-center transition-colors hover:border-accent hover:bg-accent/5"
              >
                <chip.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium leading-tight text-foreground">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categorized list */}
      <div className="flex-1 overflow-y-auto">
        {mode === "trigger" ? (
          <ul className="divide-y divide-border/70">
            {TRIGGER_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const inCat = grouped.get(cat) ?? [];
              if (inCat.length === 0 && !query) return null;
              if (inCat.length === 0) return null;
              const isOpen = !!openCats[cat] || !!query;
              return (
                <li key={cat}>
                  <button
                    onClick={() => toggleCat(cat)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${meta.badgeClass}`}
                    >
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{meta.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <ul className="space-y-px bg-muted/20 pb-2">
                      {inCat.map((it) => (
                        <li key={it.subType}>
                          <button
                            onClick={() => onPick(it)}
                            className="flex w-full items-start gap-2 px-12 py-2 text-left text-xs transition-colors hover:bg-accent/5"
                          >
                            <it.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{it.label}</p>
                              <p className="truncate text-muted-foreground">{it.description}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          // "step" mode: render a flat grouped view by category meta
          <ul className="divide-y divide-border/70">
            {Array.from(grouped.entries()).map(([cat, list]) => {
              const meta = CATEGORY_META[cat];
              return (
                <li key={cat}>
                  <div className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ring-1 ${meta.badgeClass}`}>
                      <meta.icon className="h-3 w-3" />
                    </span>
                    {meta.label}
                  </div>
                  <ul className="space-y-px py-2">
                    {list.map((it) => (
                      <li key={it.subType}>
                        <button
                          onClick={() => onPick(it)}
                          className="flex w-full items-start gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-accent/5"
                        >
                          <it.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{it.label}</p>
                            <p className="truncate text-muted-foreground">{it.description}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer skip CTA */}
      {mode === "trigger" && onSkip && (
        <div className="border-t border-border px-4 py-3">
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Skip trigger and choose eligible records
          </button>
        </div>
      )}
    </div>
  );
}
