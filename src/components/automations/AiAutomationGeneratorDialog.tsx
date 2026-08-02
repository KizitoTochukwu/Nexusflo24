import { useState } from "react";
import { Sparkles, Loader2, Wand2, AlertTriangle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useCreateAutomation,
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  phraseCondition,
  type ConditionRow,
} from "@/hooks/useAutomations";
import { getDefaultExitCriteria } from "@/lib/automations/exitCriteria";
import { toast } from "@/hooks/use-toast";

interface GeneratedStep {
  step_type: string;
  config: Record<string, any>;
  needsSetup?: string[];
}

interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: {
    enrollment_object_type: string;
    enrollment_method: string;
    trigger_source: string | null;
    trigger_event: string;
    trigger_config: Record<string, unknown>;
    filter_groups: unknown[];
    reenrollment_config: { mode: string };
    trigger_summary: string | null;
  };
  steps: GeneratedStep[];
}

const EXAMPLES = [
  "When a new lead is created, send a welcome email, wait 1 day, then send a WhatsApp check-in and tag them as 'nurture'.",
  "When someone submits a form, notify sales, add the tag 'form-lead', wait 2 days, and if they haven't opened the email, send an SMS reminder.",
  "When a lead's score passes 50, mark the status as Hot, assign an owner, and notify the sales team.",
];

const TYPE_STYLE: Record<string, string> = {
  action: "bg-primary/10 text-primary border-primary/30",
  delay: "bg-muted text-muted-foreground border-border",
  condition: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

function actionLabel(value: string) {
  return ACTION_OPTIONS.find((a) => a.value === value)?.label ?? value.replace(/_/g, " ");
}

function summarize(step: GeneratedStep): string {
  const cfg = step.config || {};
  if (step.step_type === "delay") return `Wait ${cfg.duration ?? "?"} ${cfg.unit ?? "days"}`;
  if (step.step_type === "condition") {
    const rows = (cfg.rows ?? []) as ConditionRow[];
    return rows.map((r) => phraseCondition(r)).join(cfg.logic === "OR" ? " OR " : " AND ");
  }
  if (step.step_type === "branch_yes_start") return "If YES";
  if (step.step_type === "branch_no_start") return "If NO";
  if (step.step_type === "branch_yes_end" || step.step_type === "branch_no_end") return "";
  const label = actionLabel(String(cfg.action ?? ""));
  if (cfg.subject) return `${label} — ${cfg.subject}`;
  if (cfg.tag) return `${label} — ${cfg.tag}`;
  if (cfg.new_status) return `${label} — ${cfg.new_status}`;
  if (cfg.score_delta !== undefined) return `${label} — ${cfg.score_delta > 0 ? "+" : ""}${cfg.score_delta}`;
  if (cfg.message) return `${label} — ${String(cfg.message).slice(0, 60)}`;
  return label;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (automationId: string) => void;
}

export default function AiAutomationGeneratorDialog({ open, onOpenChange, onCreated }: Props) {
  const workspaceId = useWorkspaceId();
  const createAutomation = useCreateAutomation();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedAutomation | null>(null);

  const reset = () => {
    setPrompt("");
    setResult(null);
    setGenerating(false);
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast({
        title: "Add a bit more detail",
        description: "Describe the automation in a sentence or two.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-automation", {
        body: { prompt: prompt.trim(), workspace_id: workspaceId },
      });
      if (error) {
        let message = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch { /* keep default message */ }
        throw new Error(message);
      }
      if (!data?.automation) throw new Error(data?.error || "The AI did not return an automation.");
      setResult(data.automation as GeneratedAutomation);
    } catch (e) {
      toast({
        title: "Could not generate automation",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const triggerType = result.trigger.trigger_event || "new_lead";
      const created = await createAutomation.mutateAsync({
        workspace_id: workspaceId,
        name: result.name,
        description: result.description,
        trigger_type: triggerType,
        trigger_config: (result.trigger.trigger_config as Record<string, unknown>) || {},
        exit_criteria: getDefaultExitCriteria(triggerType),
        steps: result.steps.map((s) => ({ step_type: s.step_type, config: s.config })),
        enrollment_object_type: result.trigger.enrollment_object_type,
        enrollment_method: result.trigger.enrollment_method,
        trigger_source: result.trigger.trigger_source,
        trigger_event: result.trigger.trigger_event,
        filter_groups: result.trigger.filter_groups as unknown[],
        reenrollment_config: result.trigger.reenrollment_config,
        trigger_summary: result.trigger.trigger_summary,
      } as any);
      onOpenChange(false);
      reset();
      if (created?.id) onCreated?.(created.id);
    } catch (e) {
      toast({
        title: "Could not create automation",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleSteps = (result?.steps ?? []).filter(
    (s) => s.step_type !== "branch_yes_end" && s.step_type !== "branch_no_end",
  );
  const needsSetup = (result?.steps ?? []).filter((s) => s.needsSetup?.length);
  const triggerLabel = result
    ? TRIGGER_OPTIONS.find((t) => t.value === result.trigger.trigger_event)?.label ?? result.trigger.trigger_event
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> AI Automation Generator
          </DialogTitle>
          <DialogDescription>
            Describe the automation in plain English. We'll build it right here on this page — review it, then create it and edit the steps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              rows={5}
              placeholder="e.g. When a new lead submits the contact form, send a welcome email, wait one day, then send a WhatsApp follow-up and notify sales if they haven't replied."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  disabled={generating}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
                >
                  Example {i + 1}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating automation…</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Generate automation</>
            )}
          </Button>

          {result && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{result.name}</h3>
                {result.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{result.description}</p>
                )}
              </div>

              <div className="rounded-lg border bg-card px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-accent/40">
                    trigger
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{triggerLabel}</span>
                </div>
                {result.trigger.trigger_summary && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{result.trigger.trigger_summary}</p>
                )}
              </div>

              <div className="space-y-2">
                {visibleSteps.map((s, idx) => {
                  const isBranch = s.step_type === "branch_yes_start" || s.step_type === "branch_no_start";
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-1 w-5 shrink-0 text-right text-xs text-muted-foreground">
                        {isBranch ? "" : idx + 1}
                      </span>
                      <div className={`flex-1 rounded-lg border bg-card px-3 py-2 ${isBranch ? "ml-4" : ""}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={TYPE_STYLE[s.step_type] ?? ""}>
                            {isBranch ? "branch" : s.step_type}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">{summarize(s)}</span>
                          {s.needsSetup?.length ? (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                              Needs setup
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {needsSetup.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {needsSetup.length} step{needsSetup.length > 1 ? "s" : ""} need details filled in before you activate this automation.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" onClick={handleGenerate} disabled={generating || saving}>
                  Regenerate
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <>Create automation <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
