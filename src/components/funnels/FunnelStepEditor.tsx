import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutTemplate, UserPlus, ShoppingBag, CreditCard, TrendingUp, CheckCircle,
  GripVertical, Trash2, Pencil, Plus, ArrowRight, Sparkles, Smartphone, Monitor,
  ChevronDown, FolderOpen, Tag, GitBranch,
} from "lucide-react";
import { STEP_TYPE_OPTIONS, type FunnelStep } from "@/hooks/useFunnels";
import { PIPELINE_STAGES } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STEP_ICONS: Record<string, React.ElementType> = {
  landing: LayoutTemplate,
  optin: UserPlus,
  sales: ShoppingBag,
  checkout: CreditCard,
  upsell: TrendingUp,
  thankyou: CheckCircle,
};

type LeadDestination = {
  folder_name?: string;
  apply_tags?: string[];
  source?: string;
  pipeline_stage?: string;
};

type PageContent = {
  headline?: string;
  subheadline?: string;
  body?: string;
  cta_text?: string;
  cta_color?: string;
  form_fields?: string[];
  stripe_price_id?: string;
  theme_color?: string;
  theme_font?: string;
  lead_destination?: LeadDestination;
};

interface Props {
  steps: FunnelStep[];
  onReorder: (steps: { step_type: string; page_content: Record<string, unknown> }[]) => void;
  readOnly?: boolean;
  onStepClick?: (step: FunnelStep) => void;
  activeStepId?: string | null;
}

export default function FunnelStepEditor({ steps, onReorder, readOnly, onStepClick, activeStepId }: Props) {
  const [editingStep, setEditingStep] = useState<FunnelStep | null>(null);
  const [pageContent, setPageContent] = useState<PageContent>({});
  const [mobilePreview, setMobilePreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [destOpen, setDestOpen] = useState(false);

  const openEditor = (step: FunnelStep) => {
    setEditingStep(step);
    setPageContent((step.page_content || {}) as PageContent);
    setMobilePreview(false);
  };

  const saveStep = () => {
    if (!editingStep) return;
    const updated = steps.map((s) =>
      s.id === editingStep.id || s.step_order === editingStep.step_order
        ? { step_type: s.step_type, page_content: pageContent as Record<string, unknown> }
        : { step_type: s.step_type, page_content: s.page_content }
    );
    onReorder(updated);
    setEditingStep(null);
  };

  const addStep = (afterIndex: number) => {
    const mapped = steps.map((s) => ({ step_type: s.step_type, page_content: s.page_content }));
    mapped.splice(afterIndex + 1, 0, { step_type: "landing", page_content: {} });
    onReorder(mapped);
  };

  const removeStep = (index: number) => {
    const mapped = steps
      .filter((_, i) => i !== index)
      .map((s) => ({ step_type: s.step_type, page_content: s.page_content }));
    onReorder(mapped);
  };

  const moveStep = (from: number, to: number) => {
    const mapped = steps.map((s) => ({ step_type: s.step_type, page_content: s.page_content }));
    const [moved] = mapped.splice(from, 1);
    mapped.splice(to, 0, moved);
    onReorder(mapped);
  };

  const generateAICopy = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-copy", {
        body: {
          channel: "email",
          objective: editingStep?.step_type === "sales" ? "sell" : "engage",
          tone: "professional",
          context: `Funnel step: ${editingStep?.step_type}. Generate a headline, subheadline, and CTA text.`,
        },
      });
      if (error) throw error;
      const variant = data?.variants?.[0];
      if (variant) {
        setPageContent((prev) => ({
          ...prev,
          headline: variant.subject || prev.headline,
          subheadline: variant.body?.slice(0, 120) || prev.subheadline,
          cta_text: variant.cta || prev.cta_text || "Get Started",
        }));
        toast.success("AI copy generated");
      }
    } catch {
      toast.error("Failed to generate copy");
    } finally {
      setAiLoading(false);
    }
  };

  const updateField = (key: keyof PageContent, value: unknown) => {
    setPageContent((prev) => ({ ...prev, [key]: value }));
  };

  const updateDestination = (key: keyof LeadDestination, value: unknown) => {
    setPageContent((prev) => ({
      ...prev,
      lead_destination: { ...prev.lead_destination, [key]: value },
    }));
  };

  const toggleFormField = (field: string) => {
    const fields = pageContent.form_fields || [];
    const updated = fields.includes(field) ? fields.filter((f) => f !== field) : [...fields, field];
    updateField("form_fields", updated);
  };

  const isOptinStep = editingStep?.step_type === "optin" || editingStep?.step_type === "landing";

  return (
    <div className="space-y-3">
      {/* Visual flow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.step_type] || LayoutTemplate;
          const label = STEP_TYPE_OPTIONS.find((o) => o.value === step.step_type)?.label || step.step_type;
          return (
            <div key={step.id || i} className="flex items-center gap-2">
              <Card
                className={`flex min-w-[120px] cursor-pointer flex-col items-center gap-1 p-3 transition-colors hover:border-accent ${
                  readOnly ? "" : "hover:shadow-card-hover"
                } ${activeStepId === step.id ? "border-accent ring-2 ring-accent/20" : ""}`}
                onClick={() => !readOnly && (onStepClick ? onStepClick(step) : openEditor(step))}
              >
                <div className="flex w-full items-center justify-between">
                  {!readOnly && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); if (i > 0) moveStep(i, i - 1); }}
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  )}
                  <span className="text-[10px] font-medium text-muted-foreground">Step {i + 1}</span>
                  {!readOnly && steps.length > 1 && (
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeStep(i); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Icon className="h-6 w-6 text-accent" />
                <span className="text-xs font-medium">{label}</span>
                {step.conversion_rate > 0 && (
                  <span className="text-[10px] text-muted-foreground">{step.conversion_rate.toFixed(1)}% conv.</span>
                )}
                {!readOnly && <Pencil className="mt-1 h-3 w-3 text-muted-foreground" />}
              </Card>
              {i < steps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              {!readOnly && i < steps.length - 1 && (
                <button
                  onClick={() => addStep(i)}
                  className="rounded-full border p-1 text-muted-foreground hover:border-accent hover:text-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {!readOnly && (
          <button
            onClick={() => addStep(steps.length - 1)}
            className="flex min-w-[80px] flex-col items-center gap-1 rounded-lg border border-dashed p-3 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add Step</span>
          </button>
        )}
      </div>

      {/* Step editor dialog */}
      <Dialog open={!!editingStep} onOpenChange={(o) => !o && setEditingStep(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Step: {STEP_TYPE_OPTIONS.find((o) => o.value === editingStep?.step_type)?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Step Type</Label>
              <Select
                value={editingStep?.step_type}
                onValueChange={(v) => setEditingStep((prev) => prev ? { ...prev, step_type: v } : null)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEP_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Monitor className={`h-4 w-4 ${!mobilePreview ? "text-accent" : "text-muted-foreground"}`} />
              <Switch checked={mobilePreview} onCheckedChange={setMobilePreview} />
              <Smartphone className={`h-4 w-4 ${mobilePreview ? "text-accent" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">{mobilePreview ? "Mobile" : "Desktop"} preview</span>
            </div>

            <div>
              <Label>Headline</Label>
              <Input value={pageContent.headline || ""} onChange={(e) => updateField("headline", e.target.value)} placeholder="Your compelling headline" />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea value={pageContent.subheadline || ""} onChange={(e) => updateField("subheadline", e.target.value)} placeholder="Supporting text…" rows={2} />
            </div>
            <div>
              <Label>Body Content</Label>
              <Textarea value={pageContent.body || ""} onChange={(e) => updateField("body", e.target.value)} placeholder="Main content…" rows={3} />
            </div>

            {isOptinStep && (
              <div>
                <Label>Form Fields</Label>
                <div className="mt-1 flex gap-3">
                  {["name", "email", "phone"].map((field) => (
                    <label key={field} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={pageContent.form_fields?.includes(field) ?? field === "email"}
                        onChange={() => toggleFormField(field)}
                        className="rounded"
                      />
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingStep?.step_type === "checkout" && (
              <div>
                <Label>Stripe Price ID</Label>
                <Input value={pageContent.stripe_price_id || ""} onChange={(e) => updateField("stripe_price_id", e.target.value)} placeholder="price_abc123" />
                <p className="mt-1 text-xs text-muted-foreground">Connect a Stripe price to enable checkout on this step.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA Button Text</Label>
                <Input value={pageContent.cta_text || ""} onChange={(e) => updateField("cta_text", e.target.value)} placeholder="Get Started" />
              </div>
              <div>
                <Label>CTA Color</Label>
                <Input type="color" value={pageContent.cta_color || "#c8992c"} onChange={(e) => updateField("cta_color", e.target.value)} className="h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Theme Color</Label>
                <Input type="color" value={pageContent.theme_color || "#0f1d38"} onChange={(e) => updateField("theme_color", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label>Font Family</Label>
                <Select value={pageContent.theme_font || "Inter"} onValueChange={(v) => updateField("theme_font", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                    <SelectItem value="system-ui">System UI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lead Destination Settings */}
            {isOptinStep && (
              <Collapsible open={destOpen} onOpenChange={setDestOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-accent" />
                      Lead Destination Settings
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${destOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground">
                    Configure where captured leads go and what metadata is applied.
                  </p>
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Tag className="h-3 w-3" /> Apply Tags (comma-separated)
                    </Label>
                    <Input
                      value={pageContent.lead_destination?.apply_tags?.join(", ") || ""}
                      onChange={(e) => updateDestination("apply_tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                      placeholder="webinar, vip, newsletter"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <FolderOpen className="h-3 w-3" /> Set Source
                    </Label>
                    <Input
                      value={pageContent.lead_destination?.source || ""}
                      onChange={(e) => updateDestination("source", e.target.value)}
                      placeholder="Landing Page"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <GitBranch className="h-3 w-3" /> Pipeline Stage
                    </Label>
                    <Select
                      value={pageContent.lead_destination?.pipeline_stage || "new_lead"}
                      onValueChange={(v) => updateDestination("pipeline_stage", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <FolderOpen className="h-3 w-3" /> Save to Folder (name)
                    </Label>
                    <Input
                      value={pageContent.lead_destination?.folder_name || ""}
                      onChange={(e) => updateDestination("folder_name", e.target.value)}
                      placeholder="Webinar Signups"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button variant="outline" className="w-full gap-2" onClick={generateAICopy} disabled={aiLoading}>
              <Sparkles className="h-4 w-4" />
              {aiLoading ? "Generating…" : "Generate Copy with AI"}
            </Button>

            <div>
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div
                className={`mt-1 rounded-lg border p-4 ${mobilePreview ? "max-w-[320px] mx-auto" : ""}`}
                style={{ fontFamily: pageContent.theme_font || "Inter", background: `${pageContent.theme_color || "#0f1d38"}10` }}
              >
                <h3 className="text-lg font-bold" style={{ color: pageContent.theme_color || "#0f1d38" }}>
                  {pageContent.headline || "Your Headline"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{pageContent.subheadline || "Supporting text"}</p>
                {pageContent.body && <p className="mt-2 text-sm">{pageContent.body}</p>}
                {isOptinStep && (
                  <div className="mt-3 space-y-2">
                    {(pageContent.form_fields || ["email"]).map((f) => (
                      <div key={f} className="rounded border bg-background px-3 py-1.5 text-xs text-muted-foreground">{f}</div>
                    ))}
                  </div>
                )}
                <button
                  className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: pageContent.cta_color || "#c8992c" }}
                >
                  {pageContent.cta_text || "Get Started"}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStep(null)}>Cancel</Button>
            <Button onClick={saveStep}>Save Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
