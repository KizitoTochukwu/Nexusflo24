import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCreateCampaign, useGenerateCampaignCopy,
  CAMPAIGN_TYPES, CAMPAIGN_OBJECTIVES, CAMPAIGN_MODES, TRIGGER_TYPES, TONE_OPTIONS,
} from "@/hooks/useCampaigns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  Plus, Mail, MessageSquare, Phone, Layers, Sparkles, Zap, Radio,
  Loader2, Copy, ChevronRight, ChevronLeft, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  "multi-channel": <Layers className="h-4 w-4" />,
};

const modeIcons: Record<string, React.ReactNode> = {
  broadcast: <Radio className="h-4 w-4" />,
  triggered: <Zap className="h-4 w-4" />,
};

const TOTAL_STEPS = 5;

export default function CreateCampaignDialog() {
  const workspaceId = useWorkspaceId();
  const createCampaign = useCreateCampaign();
  const generateCopy = useGenerateCampaignCopy();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState("email");
  const [objective, setObjective] = useState("broadcast");
  const [campaignMode, setCampaignMode] = useState("broadcast");

  // Step 2 - Triggers (only if triggered mode)
  const [triggerType, setTriggerType] = useState("new_lead");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggerActions, setTriggerActions] = useState<string[]>(["send_message"]);

  // Step 3 - Content
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiContext, setAiContext] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiVariants, setAiVariants] = useState<Array<{ subject: string; body: string; cta: string }>>([]);

  // Step 4 - Fallback
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackChannel, setFallbackChannel] = useState("sms");
  const [fallbackDelay, setFallbackDelay] = useState("30");
  const [fallbackCondition, setFallbackCondition] = useState("unread");

  // Step 4.5 - Audience Filter
  const [audienceStatuses, setAudienceStatuses] = useState<string[]>([]);
  const [audienceTags, setAudienceTags] = useState("");
  const [audienceMinScore, setAudienceMinScore] = useState("");
  const [audienceMaxScore, setAudienceMaxScore] = useState("");

  // Step 5 - Schedule
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  const reset = () => {
    setStep(1); setName(""); setType("email"); setObjective("broadcast");
    setCampaignMode("broadcast"); setTriggerType("new_lead"); setTriggerValue("");
    setTriggerActions(["send_message"]); setSubject(""); setBody("");
    setAiTone("professional"); setAiContext(""); setShowAiPanel(false); setAiVariants([]);
    setFallbackEnabled(false); setFallbackChannel("sms"); setFallbackDelay("30");
    setFallbackCondition("unread"); setScheduleNow(true); setScheduledAt("");
  };

  const handleGenerateAI = async () => {
    try {
      const result = await generateCopy.mutateAsync({
        channel: type, objective, tone: aiTone, context: aiContext || undefined,
      });
      setAiVariants(result.variants || []);
      toast.success("AI copy generated!");
    } catch {
      // error handled in hook
    }
  };

  const applyVariant = (v: { subject: string; body: string; cta: string }) => {
    setSubject(v.subject);
    setBody(v.body + (v.cta ? `\n\n${v.cta}` : ""));
    setShowAiPanel(false);
    toast.success("Copy applied");
  };

  const handleCreate = async () => {
    await createCampaign.mutateAsync({
      workspace_id: workspaceId,
      name,
      type,
      objective,
      campaign_mode: campaignMode,
      status: campaignMode === "triggered" ? "active" : scheduleNow ? "active" : "scheduled",
      message_content: { subject, body } as any,
      scheduled_at: scheduleNow ? null : scheduledAt || null,
      trigger_config: campaignMode === "triggered" ? {
        type: triggerType, value: triggerValue, actions: triggerActions,
      } as any : {} as any,
      fallback_settings: fallbackEnabled ? {
        enabled: true, channel: fallbackChannel,
        delay_minutes: parseInt(fallbackDelay), condition: fallbackCondition,
      } as any : {} as any,
      audience_filter: {
        ...(audienceStatuses.length > 0 ? { statuses: audienceStatuses } : {}),
        ...(audienceTags.trim() ? { tags: audienceTags.split(",").map(t => t.trim()).filter(Boolean) } : {}),
        ...(audienceMinScore ? { min_score: parseInt(audienceMinScore) } : {}),
        ...(audienceMaxScore ? { max_score: parseInt(audienceMaxScore) } : {}),
      } as any,
    });
    setOpen(false);
    reset();
  };

  // Determine actual step to show (skip triggers step in broadcast mode)
  const getVisibleStep = () => {
    if (campaignMode === "broadcast" && step === 2) return -1; // skip
    return step;
  };

  const nextStep = () => {
    if (step === 1 && campaignMode === "broadcast") setStep(3);
    else setStep(step + 1);
  };
  const prevStep = () => {
    if (step === 3 && campaignMode === "broadcast") setStep(1);
    else setStep(step - 1);
  };

  const stepLabel = () => {
    const labels: Record<number, string> = {
      1: "Channel & Mode",
      2: "Automation Triggers",
      3: "Compose Message",
      4: "Fallback Settings",
      5: "Review & Launch",
    };
    return labels[step] || "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{step}</span>
            {stepLabel()}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-muted"}`} />
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1: Channel & Mode */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale Blast" />
            </div>
            <div>
              <Label>Channel</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CAMPAIGN_TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      type === t ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"
                    }`}>{channelIcons[t]} {t}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Campaign Mode</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CAMPAIGN_MODES.map((m) => (
                  <button key={m} onClick={() => setCampaignMode(m)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      campaignMode === m ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"
                    }`}>{modeIcons[m]} {m}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {campaignMode === "broadcast" ? "Send manually or on schedule." : "Automatically triggered by lead events."}
              </p>
            </div>
            <div>
              <Label>Objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={nextStep} disabled={!name.trim()} className="w-full gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: Triggers (only for triggered mode) */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Trigger Event</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(triggerType === "score_threshold") && (
              <div>
                <Label>Score Threshold</Label>
                <Input type="number" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. 50" />
              </div>
            )}
            {(triggerType === "tag_added" || triggerType === "tag_removed") && (
              <div>
                <Label>Tag Name</Label>
                <Input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. hot-lead" />
              </div>
            )}
            <div>
              <Label>Actions when triggered</Label>
              <div className="mt-1 space-y-2">
                {[
                  { value: "send_message", label: "Send campaign message" },
                  { value: "update_status", label: "Update lead status" },
                  { value: "add_tag", label: "Add tag to lead" },
                ].map((a) => (
                  <label key={a.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={triggerActions.includes(a.value)}
                      onChange={(e) => {
                        if (e.target.checked) setTriggerActions([...triggerActions, a.value]);
                        else setTriggerActions(triggerActions.filter((x) => x !== a.value));
                      }}
                      className="rounded border-border" />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3: Compose */}
        {step === 3 && (
          <div className="space-y-4">
            {/* AI Copy Generator */}
            <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
              <button onClick={() => setShowAiPanel(!showAiPanel)}
                className="flex w-full items-center justify-between text-sm font-medium text-accent-foreground">
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI Copy Generator</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showAiPanel ? "rotate-90" : ""}`} />
              </button>

              {showAiPanel && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tone</Label>
                      <Select value={aiTone} onValueChange={setAiTone}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Objective</Label>
                      <Select value={objective} onValueChange={setObjective}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CAMPAIGN_OBJECTIVES.map((o) => (
                            <SelectItem key={o} value={o} className="capitalize text-xs">{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Context (optional)</Label>
                    <Input value={aiContext} onChange={(e) => setAiContext(e.target.value)}
                      placeholder="e.g. 30% off summer collection, target: young professionals"
                      className="h-8 text-xs" />
                  </div>
                  <Button onClick={handleGenerateAI} disabled={generateCopy.isPending}
                    size="sm" className="w-full gap-2">
                    {generateCopy.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {generateCopy.isPending ? "Generating..." : "Generate Copy"}
                  </Button>

                  {aiVariants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Pick a variant:</p>
                      {aiVariants.map((v, i) => (
                        <button key={i} onClick={() => applyVariant(v)}
                          className="w-full rounded-lg border bg-card p-3 text-left text-xs transition-colors hover:border-accent/50">
                          <p className="font-semibold text-foreground">{v.subject}</p>
                          <p className="mt-1 line-clamp-2 text-muted-foreground">{v.body}</p>
                          <div className="mt-2 flex items-center gap-1 text-accent">
                            <Copy className="h-3 w-3" /> Use this variant
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Subject / Title</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Don't miss our summer deals!" />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your campaign message..." rows={5} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} disabled={!body.trim()} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 4: Fallback */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Fallback Messaging</p>
                  <p className="text-xs text-muted-foreground">Auto-send SMS if primary channel fails</p>
                </div>
              </div>
              <Switch checked={fallbackEnabled} onCheckedChange={setFallbackEnabled} />
            </div>

            {fallbackEnabled && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <Label className="text-xs">Fallback Channel</Label>
                  <Select value={fallbackChannel} onValueChange={setFallbackChannel}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fallback Condition</Label>
                  <Select value={fallbackCondition} onValueChange={setFallbackCondition}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">Message unread</SelectItem>
                      <SelectItem value="bounced">Email bounced</SelectItem>
                      <SelectItem value="failed">Delivery failed</SelectItem>
                      <SelectItem value="no_reply">No reply received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Delay (minutes)
                  </Label>
                  <Input type="number" value={fallbackDelay} onChange={(e) => setFallbackDelay(e.target.value)}
                    min="5" max="1440" className="h-8" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wait this long before sending fallback (5–1440 min)
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Launch */}
        {step === 5 && (
          <div className="space-y-4">
            {campaignMode === "broadcast" && (
              <div>
                <Label>Delivery</Label>
                <div className="mt-1 flex gap-2">
                  <button onClick={() => setScheduleNow(true)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                    }`}>Send Now</button>
                  <button onClick={() => setScheduleNow(false)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      !scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                    }`}>Schedule</button>
                </div>
              </div>
            )}
            {!scheduleNow && campaignMode === "broadcast" && (
              <div>
                <Label>Schedule Date & Time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium text-foreground mb-2">Campaign Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{name}</span>
                <span className="text-muted-foreground">Channel</span><span className="font-medium text-foreground capitalize">{type}</span>
                <span className="text-muted-foreground">Mode</span><span className="font-medium text-foreground capitalize">{campaignMode}</span>
                <span className="text-muted-foreground">Objective</span><span className="font-medium text-foreground capitalize">{objective}</span>
                {campaignMode === "triggered" && (
                  <>
                    <span className="text-muted-foreground">Trigger</span>
                    <span className="font-medium text-foreground">{TRIGGER_TYPES.find(t => t.value === triggerType)?.label}</span>
                  </>
                )}
                {fallbackEnabled && (
                  <>
                    <span className="text-muted-foreground">Fallback</span>
                    <span className="font-medium text-foreground capitalize">{fallbackChannel} after {fallbackDelay}m ({fallbackCondition})</span>
                  </>
                )}
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium text-foreground">
                  {campaignMode === "triggered" ? "Auto (on trigger)" : scheduleNow ? "Immediate" : scheduledAt || "Not set"}
                </span>
              </div>
            </div>

            {/* Integration placeholders */}
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Integration Status</p>
              <div className="grid gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email (SendGrid/MailerLite)</span>
                  <span className="text-accent text-[10px] font-medium bg-accent/10 px-1.5 py-0.5 rounded">Placeholder</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> WhatsApp Cloud API</span>
                  <span className="text-accent text-[10px] font-medium bg-accent/10 px-1.5 py-0.5 rounded">Placeholder</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> SMS Gateway</span>
                  <span className="text-accent text-[10px] font-medium bg-accent/10 px-1.5 py-0.5 rounded">Placeholder</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={handleCreate} disabled={createCampaign.isPending} className="flex-1">
                {createCampaign.isPending ? "Creating..." : campaignMode === "triggered" ? "Activate Automation" : scheduleNow ? "Launch Campaign" : "Schedule Campaign"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
