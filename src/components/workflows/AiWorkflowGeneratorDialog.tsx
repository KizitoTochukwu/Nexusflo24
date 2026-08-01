import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useCreateWorkflow, useUpdateWorkflow } from "@/hooks/useWorkflows";
import { toast } from "@/hooks/use-toast";
import type { WorkflowCanvasJSON } from "@/lib/workflows/types";

interface GeneratedWorkflow {
  name: string;
  description: string;
  canvas_json: WorkflowCanvasJSON;
  enrollment: {
    object_type: string;
    method: string;
    source: string | null;
    event: string | null;
    config: Record<string, unknown>;
    filter_groups: unknown[];
  };
}

const EXAMPLES = [
  "When a new insurance lead submits the assessment form, assign the lead to the insurance sales team, send a confirmation email, wait one day, create a follow-up task, and notify the sales manager if the lead has not been contacted.",
  "When someone books a discovery call, send a WhatsApp confirmation, wait 1 day before the call, send a reminder email, and tag them as 'call-booked'.",
  "When a lead's score goes above 50, add the tag 'hot', assign an owner, and notify the team on Slack via webhook.",
];

const KIND_STYLE: Record<string, string> = {
  trigger: "bg-accent/15 text-accent-foreground border-accent/40",
  action: "bg-primary/10 text-primary border-primary/30",
  condition: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  delay: "bg-muted text-muted-foreground border-border",
  merge: "bg-muted text-muted-foreground border-border",
  goal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AiWorkflowGeneratorDialog({ open, onOpenChange }: Props) {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const create = useCreateWorkflow(workspaceId);
  const update = useUpdateWorkflow(workspaceId);

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedWorkflow | null>(null);

  const reset = () => {
    setPrompt("");
    setResult(null);
    setGenerating(false);
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast({ title: "Add a bit more detail", description: "Describe the automation in a sentence or two.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workflow", {
        body: { prompt: prompt.trim(), workspace_id: workspaceId },
      });
      if (error) {
        // Surface the real server message instead of the generic non-2xx text
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
      if (!data?.workflow) throw new Error(data?.error || "The AI did not return a workflow.");
      setResult(data.workflow as GeneratedWorkflow);
    } catch (e) {
      toast({
        title: "Could not generate workflow",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const created = await create.mutateAsync({
        name: result.name,
        description: result.description,
        canvas_json: result.canvas_json,
      });
      await update.mutateAsync({
        id: created.id,
        patch: {
          enrollment_object_type: result.enrollment.object_type,
          enrollment_method: result.enrollment.method,
          trigger_source: result.enrollment.source,
          trigger_event: result.enrollment.event,
          trigger_config: result.enrollment.config as Record<string, any>,
          filter_groups: result.enrollment.filter_groups as any,
        } as any,
      });
      toast({ title: "Draft workflow created", description: "Review and edit it before publishing." });
      onOpenChange(false);
      reset();
      navigate(`/dashboard/${workspaceId}/workflows/${created.id}`);
    } catch (e) {
      toast({
        title: "Could not save workflow",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nodes = result?.canvas_json?.nodes ?? [];
  const needsSetup = nodes.filter((n) => (n.data as any)?.needsSetup);

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
            <Sparkles className="h-5 w-5 text-accent" /> AI Workflow Generator
          </DialogTitle>
          <DialogDescription>
            Describe the automation in plain English. We'll build a visual workflow you can review and edit before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              rows={5}
              placeholder="e.g. When a new insurance lead submits the assessment form, assign them to the insurance sales team, send a confirmation email, wait one day, then notify the sales manager if they haven't been contacted."
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
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating workflow…</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Generate workflow</>
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

              <div className="space-y-2">
                {nodes.map((n, idx) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <span className="mt-1 w-5 shrink-0 text-right text-xs text-muted-foreground">{idx + 1}</span>
                    <div className="flex-1 rounded-lg border bg-card px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={KIND_STYLE[(n.data as any)?.kind] ?? ""}>
                          {(n.data as any)?.kind}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{(n.data as any)?.label}</span>
                        {(n.data as any)?.needsSetup && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                            Needs setup
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{(n.data as any)?.subType}</p>
                    </div>
                  </div>
                ))}
              </div>

              {needsSetup.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {needsSetup.length} step{needsSetup.length > 1 ? "s" : ""} need details filled in (owner, folder, or template) on the canvas before you publish.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" onClick={handleGenerate} disabled={generating || saving}>
                  Regenerate
                </Button>
                <Button onClick={handleSaveDraft} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <>Open in builder <ArrowRight className="ml-2 h-4 w-4" /></>
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
