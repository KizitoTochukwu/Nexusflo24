import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCreateForm, useUpdateForm, DEFAULT_THEME } from "@/hooks/useForms";
import { normalizeGeneratedForm, type GeneratedForm } from "@/lib/forms/aiForm";

const IDEAS = [
  "Newsletter signup for a marketing agency",
  "Webinar registration with name, email, phone and company size",
  "Contact us form with subject and message",
  "Coaching application with budget and goals",
  "Quote request for a home services business",
];

export default function AiFormDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();

  const [prompt, setPrompt] = useState("");
  const [multiStep, setMultiStep] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedForm | null>(null);

  const reset = () => {
    setResult(null);
    setGenerating(false);
    setSaving(false);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) reset();
  };

  const generate = async () => {
    if (prompt.trim().length < 5) {
      toast.error("Tell us a bit more about the form you need");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-form", {
        body: { prompt: prompt.trim(), multi_step: multiStep },
      });
      if (error) {
        const msg = (await (error as any).context?.json?.().catch(() => null))?.error;
        throw new Error(msg || error.message || "Could not generate the form");
      }
      const normalized = normalizeGeneratedForm(data?.form);
      if (!normalized) throw new Error("The AI response could not be used. Please try again.");
      setResult(normalized);
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate the form");
    } finally {
      setGenerating(false);
    }
  };

  const createIt = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const created = await createForm.mutateAsync({
        workspace_id: workspaceId,
        name: result.name,
      });
      await updateForm.mutateAsync({
        id: created.id,
        description: result.description,
        schema: result.schema as any,
        settings: result.settings as any,
        theme: DEFAULT_THEME as any,
        status: "draft",
      });
      handleClose(false);
      navigate(`/dashboard/${workspaceId}/forms/${created.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save the form");
    } finally {
      setSaving(false);
    }
  };

  const fieldCount = result?.schema.steps.reduce((n, s) => n + s.fields.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Generate a form with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to collect and who it's for. You can edit everything afterwards.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <Textarea
              rows={4}
              autoFocus
              placeholder="e.g. Webinar registration for an AI sales masterclass — collect name, email, phone and team size"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-accent hover:text-foreground"
                >
                  {idea}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="ai-multi-step" className="text-sm font-normal">
                Split into multiple steps
              </Label>
              <Switch id="ai-multi-step" checked={multiStep} onCheckedChange={setMultiStep} />
            </div>
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="font-medium">{result.name}</p>
              {result.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{result.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {fieldCount} fields · {result.schema.steps.length} step
                {result.schema.steps.length > 1 ? "s" : ""}
              </p>
            </div>
            {result.schema.steps.map((step, i) => (
              <div key={step.id} className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {step.title || `Step ${i + 1}`}
                </p>
                <ul className="space-y-1.5">
                  {step.fields.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {f.required && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            required
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {f.type.replace(/_/g, " ")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-lg border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Button: </span>
                {result.settings.submit_text}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Thank you: </span>
                {result.settings.success_message}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Generate
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={generate} disabled={generating || saving}>
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                )}
                Try again
              </Button>
              <Button onClick={createIt} disabled={saving || generating}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create form
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
