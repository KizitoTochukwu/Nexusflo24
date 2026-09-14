import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCreateFunnel, OBJECTIVE_OPTIONS, STEP_TYPE_OPTIONS } from "@/hooks/useFunnels";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_STEPS: Record<string, string[]> = {
  lead_capture: ["landing", "optin", "thankyou"],
  webinar: ["landing", "optin", "thankyou"],
  product_sale: ["landing", "sales", "checkout", "thankyou"],
  upsell: ["sales", "upsell", "checkout", "thankyou"],
  booking: ["landing", "optin", "thankyou"],
};

type Mode = "choose" | "manual" | "ai";

interface AiFunnelResult {
  name: string;
  description: string;
  objective: string;
  steps: { step_type: string; page_content: Record<string, unknown> }[];
}

const IDEAS = [
  "Lead magnet funnel offering a free checklist for small business owners",
  "Webinar registration funnel for a live AI marketing masterclass",
  "Coaching application funnel that qualifies serious clients",
  "Product launch funnel for a £97 online course with an upsell",
  "Free consultation booking funnel for a service business",
];

interface CreateFunnelDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialMode?: Mode;
  hideTrigger?: boolean;
}

export default function CreateFunnelDialog({
  open: openProp,
  onOpenChange,
  initialMode = "choose",
  hideTrigger = false,
}: CreateFunnelDialogProps = {}) {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const createFunnel = useCreateFunnel();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [mode, setMode] = useState<Mode>(initialMode);

  // Offer/audience hints for AI
  const [aiOffer, setAiOffer] = useState("");
  const [aiAudience, setAiAudience] = useState("");

  // Manual fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("lead_capture");

  // AI fields
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiFunnelResult | null>(null);

  const suggestedSteps = DEFAULT_STEPS[objective] || DEFAULT_STEPS.lead_capture;

  const resetAll = () => {
    setMode(initialMode);
    setName("");
    setDescription("");
    setObjective("lead_capture");
    setAiPrompt("");
    setAiOffer("");
    setAiAudience("");
    setAiResult(null);
    setAiLoading(false);
  };

  const handleManualSubmit = () => {
    if (!name.trim()) return;
    createFunnel.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim(),
        description,
        objective,
        steps: suggestedSteps.map((st) => ({ step_type: st })),
      },
      { onSuccess: () => { setOpen(false); resetAll(); } },
    );
  };

  const buildPrompt = () => {
    const extras: string[] = [];
    if (aiOffer.trim()) extras.push(`Offer / product: ${aiOffer.trim()}`);
    if (aiAudience.trim()) extras.push(`Target audience: ${aiAudience.trim()}`);
    return [aiPrompt.trim(), ...extras].join("\n");
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-funnel", {
        body: { prompt: buildPrompt() },
      });
      if (error) throw error;
      if (!data?.funnel) throw new Error("No funnel data returned");
      setAiResult(data.funnel as AiFunnelResult);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate funnel");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCreate = () => {
    if (!aiResult) return;
    createFunnel.mutate(
      {
        workspace_id: workspaceId,
        name: aiResult.name,
        description: aiResult.description || "",
        objective: aiResult.objective,
        steps: aiResult.steps.map((s) => ({
          step_type: s.step_type,
          page_content: s.page_content,
        })),
      },
      { onSuccess: () => { setOpen(false); resetAll(); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "choose" ? "Create Funnel" : mode === "manual" ? "Manual Funnel" : "AI Funnel Builder"}
          </DialogTitle>
        </DialogHeader>

        {/* === Mode Chooser === */}
        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => setMode("manual")}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium">Build Manually</span>
              <span className="text-xs text-muted-foreground">Choose objective & steps yourself</span>
            </button>
            <button
              onClick={() => setMode("ai")}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-accent p-6 text-center transition-colors hover:border-accent hover:bg-accent/10"
            >
              <Sparkles className="h-8 w-8 text-accent" />
              <span className="font-medium">Generate with AI</span>
              <span className="text-xs text-muted-foreground">Describe your goal, AI builds it</span>
            </button>
          </div>
        )}

        {/* === Manual Mode === */}
        {mode === "manual" && (
          <>
            <div className="space-y-4 py-2">
              <div>
                <Label>Funnel Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Launch Funnel" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description…" rows={2} />
              </div>
              <div>
                <Label>Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Suggested Steps</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {suggestedSteps.map((st, i) => {
                    const label = STEP_TYPE_OPTIONS.find((o) => o.value === st)?.label || st;
                    return (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {i + 1}. {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleManualSubmit} disabled={!name.trim() || createFunnel.isPending}>
                {createFunnel.isPending ? "Creating…" : "Create Funnel"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* === AI Mode === */}
        {mode === "ai" && (
          <>
            <div className="space-y-4 py-2">
              {!aiResult ? (
                <>
                  <div>
                    <Label>Describe your funnel</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. A webinar funnel for my fitness coaching business that captures leads and upsells a $97 program…"
                      rows={4}
                      disabled={aiLoading}
                    />
                  </div>
                  <Button
                    onClick={handleAiGenerate}
                    disabled={!aiPrompt.trim() || aiLoading}
                    className="w-full gap-2"
                  >
                    {aiLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating Funnel…</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate Funnel with AI</>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <h4 className="font-semibold text-sm">{aiResult.name}</h4>
                    {aiResult.description && (
                      <p className="text-xs text-muted-foreground">{aiResult.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {OBJECTIVE_OPTIONS.find((o) => o.value === aiResult.objective)?.label || aiResult.objective}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Generated Steps</Label>
                    <div className="mt-1.5 space-y-1.5">
                      {aiResult.steps.map((step, i) => {
                        const label = STEP_TYPE_OPTIONS.find((o) => o.value === step.step_type)?.label || step.step_type;
                        const blockCount = (step.page_content as any)?.blocks?.length || 0;
                        return (
                          <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span className="font-medium">{i + 1}. {label}</span>
                            {blockCount > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {blockCount} blocks
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiResult(null)}
                    className="w-full"
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => { setMode("choose"); setAiResult(null); }}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              {aiResult && (
                <Button onClick={handleAiCreate} disabled={createFunnel.isPending}>
                  {createFunnel.isPending ? "Creating…" : "Create Funnel"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
