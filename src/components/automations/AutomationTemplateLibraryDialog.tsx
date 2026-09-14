import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Sparkles, Check, Clock, GitBranch, Zap, Mail, MessageCircle, Smartphone } from "lucide-react";
import {
  AUTOMATION_TEMPLATES,
  AUTOMATION_TEMPLATE_CATEGORIES,
  templateChannels,
  templateStepCount,
  toDefinition,
  type AutomationTemplate,
} from "@/lib/automations/templates";
import { TRIGGER_OPTIONS, ACTION_OPTIONS, CONDITION_OPTIONS, useCreateAutomation } from "@/hooks/useAutomations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  existingNames: string[];
  onInstalled?: (automationId: string) => void;
};

const CHANNEL_ICON: Record<string, typeof Mail> = {
  Email: Mail,
  WhatsApp: MessageCircle,
  SMS: Smartphone,
};

function triggerLabel(type: string) {
  return TRIGGER_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function describeStep(step: AutomationTemplate["steps"][number]): { text: string; kind: "action" | "delay" | "condition" | "branch" } {
  const cfg = step.config as Record<string, unknown>;
  if (step.step_type === "delay") {
    return { text: `Wait ${cfg.duration} ${cfg.unit}`, kind: "delay" };
  }
  if (step.step_type === "condition") {
    const label = CONDITION_OPTIONS.find((c) => c.value === cfg.condition)?.label ?? String(cfg.condition ?? "");
    const op = String(cfg.operator ?? "").replace(/_/g, " ");
    const value = cfg.value !== undefined ? ` ${cfg.value}` : "";
    return { text: `If ${label} ${op}${value}`.trim(), kind: "condition" };
  }
  if (step.step_type.startsWith("branch_")) {
    const side = step.step_type.includes("yes") ? "Yes" : "No";
    const label = cfg.label ? `: ${cfg.label}` : "";
    return { text: `${side} branch${label}`, kind: "branch" };
  }
  const action = String(cfg.action ?? "");
  const label = ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action;
  let detail = "";
  if (action === "send_email") detail = ` — "${cfg.subject}"`;
  else if (action === "send_whatsapp" || action === "send_sms") detail = ` — "${String(cfg.message ?? "").slice(0, 60)}…"`;
  else if (action === "add_tag" || action === "remove_tag") detail = ` — ${cfg.tag}`;
  else if (action === "update_status") detail = ` — ${cfg.new_status}`;
  else if (action === "adjust_score") detail = ` — ${Number(cfg.score_delta) > 0 ? "+" : ""}${cfg.score_delta} points`;
  else if (action === "notify_sales") detail = ` — ${cfg.title}`;
  return { text: `${label}${detail}`, kind: "action" };
}

export default function AutomationTemplateLibraryDialog({ open, onOpenChange, workspaceId, existingNames, onInstalled }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<AutomationTemplate | null>(null);
  const createAutomation = useCreateAutomation();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUTOMATION_TEMPLATES.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      return `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q);
    });
  }, [query, category]);

  const active = selected && filtered.includes(selected) ? selected : filtered[0] ?? null;

  const handleUse = async (tmpl: AutomationTemplate) => {
    const created = await createAutomation.mutateAsync({ workspace_id: workspaceId, ...toDefinition(tmpl) });
    toast.success(`"${tmpl.name}" added as a draft — review the copy, then activate.`);
    onOpenChange(false);
    if (created?.id) onInstalled?.(created.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Automation templates
          </DialogTitle>
          <DialogDescription>
            Ready-made flows built on Nexusflo24's triggers, conditions and channels. Every template is added as a draft so you can edit the wording before it sends.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: browse */}
          <div className="border-r">
            <div className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search templates…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["All", ...AUTOMATION_TEMPLATE_CATEGORIES].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      category === c
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[52vh]">
              <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
                {filtered.map((t) => {
                  const installed = existingNames.includes(t.name);
                  const isActive = active?.slug === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setSelected(t)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-shadow hover:shadow-card",
                        isActive ? "border-accent ring-1 ring-accent/40" : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug">{t.name}</span>
                        {installed && (
                          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                            <Check className="h-3 w-3" /> Added
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                        {templateChannels(t).map((ch) => {
                          const Icon = CHANNEL_ICON[ch] ?? Mail;
                          return (
                            <span key={ch} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Icon className="h-3 w-3" /> {ch}
                            </span>
                          );
                        })}
                        <span className="text-[10px] text-muted-foreground">{templateStepCount(t)} steps</span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                    No templates match "{query}".
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: preview */}
          <div className="flex flex-col">
            {active ? (
              <>
                <div className="space-y-2 border-b p-4">
                  <h3 className="text-sm font-semibold">{active.name}</h3>
                  <p className="text-xs text-muted-foreground">{active.description}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <span className="text-muted-foreground">Trigger: {triggerLabel(active.trigger_type)}</span>
                  </div>
                </div>
                <ScrollArea className="h-[42vh]">
                  <ol className="space-y-2 p-4">
                    {active.steps.map((s, i) => {
                      const { text, kind } = describeStep(s);
                      const Icon = kind === "delay" ? Clock : kind === "condition" ? GitBranch : Zap;
                      return (
                        <li
                          key={i}
                          className={cn(
                            "flex items-start gap-2 text-xs",
                            kind === "branch" ? "pl-4 font-medium text-accent" : "text-foreground",
                          )}
                        >
                          {kind !== "branch" && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          <span>{text}</span>
                        </li>
                      );
                    })}
                  </ol>
                </ScrollArea>
                <div className="mt-auto border-t p-4">
                  <Button className="w-full gap-1.5" disabled={createAutomation.isPending} onClick={() => handleUse(active)}>
                    <Sparkles className="h-4 w-4" />
                    {createAutomation.isPending ? "Adding…" : "Use this template"}
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Added as a draft — nothing sends until you activate it.
                  </p>
                </div>
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Select a template to preview its steps.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
