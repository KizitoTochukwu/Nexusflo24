import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, History, RotateCcw, Save, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceHosts } from "@/hooks/useBookingTeams";
import {
  useVoiceAssistant, useSaveVoiceAssistantDraft, usePublishVoiceAssistant,
  useVoiceAssistantVersions, useRollbackVoiceAssistant, useVoicePipelineOptions,
  useVoiceBookingPages, useVoiceNumbers, useVoiceKnowledge, useUpdateVoiceAssistant,
} from "@/hooks/useVoice";
import { VoiceSetupNotice, VoiceStatusBadge, VoiceSection } from "@/components/voice/VoicePrimitives";
import ChipListEditor from "@/components/voice/ChipListEditor";
import {
  DEFAULT_ASSISTANT_CONFIG, VOICE_WIZARD_STEPS, VOICE_LANGUAGES, VOICE_VOICES, WEEKDAYS,
  activationChecklist, buildRuntimePrompt, canActivate, isWizardStepComplete,
  normalizeAssistantConfig, type VoiceAssistantConfig,
} from "@/lib/voice/assistantConfig";
import { VOICE_ASSISTANT_STATUSES } from "@/lib/voice/constants";
import { toast } from "sonner";

export default function VoiceAssistantEditor() {
  const workspaceId = useWorkspaceId();
  const { assistantId } = useParams<{ assistantId: string }>();
  const navigate = useNavigate();

  const { data: assistant, isLoading } = useVoiceAssistant(assistantId);
  const { data: versions = [] } = useVoiceAssistantVersions(assistantId);
  const { data: pipelineData } = useVoicePipelineOptions(workspaceId);
  const { data: bookingPages = [] } = useVoiceBookingPages(workspaceId);
  const { data: hosts = [] } = useWorkspaceHosts(workspaceId);
  const { data: numbers = [] } = useVoiceNumbers(workspaceId);
  const { data: knowledge = [] } = useVoiceKnowledge(workspaceId);

  const save = useSaveVoiceAssistantDraft(workspaceId);
  const publish = usePublishVoiceAssistant(workspaceId);
  const rollback = useRollbackVoiceAssistant(workspaceId);
  const updateAssistant = useUpdateVoiceAssistant(workspaceId);

  const [name, setName] = useState("");
  const [config, setConfig] = useState<VoiceAssistantConfig>(DEFAULT_ASSISTANT_CONFIG);
  const [stepIndex, setStepIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Hydrate from the saved draft (save-and-resume).
  useEffect(() => {
    if (!assistant) return;
    setName(assistant.name);
    setConfig(normalizeAssistantConfig({
      ...(assistant.config ?? {}),
      greeting: (assistant.config as any)?.greeting ?? assistant.greeting ?? "",
      persona: (assistant.config as any)?.persona ?? assistant.persona ?? "",
      language: (assistant.config as any)?.language ?? assistant.language,
      recordingEnabled: (assistant.config as any)?.recordingEnabled ?? assistant.recording_enabled,
    }));
    setDirty(false);
  }, [assistant?.id, assistant?.published_version]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (next: Partial<VoiceAssistantConfig>) => {
    setConfig((c) => ({ ...c, ...next }));
    setDirty(true);
  };

  const step = VOICE_WIZARD_STEPS[stepIndex];
  const runtimePrompt = useMemo(() => buildRuntimePrompt(config, name), [config, name]);
  const assignedNumbers = numbers.filter((n) => n.assistant_id === assistantId).length;
  const assistantKnowledge = knowledge.filter((k) => !k.assistant_id || k.assistant_id === assistantId).length;

  const checks = useMemo(
    () => activationChecklist({
      config,
      name,
      publishedVersion: assistant?.published_version ?? null,
      numbersAssigned: assignedNumbers,
      knowledgeCount: assistantKnowledge,
    }),
    [config, name, assistant?.published_version, assignedNumbers, assistantKnowledge],
  );
  const activationReady = canActivate(checks);

  const stages = (pipelineData?.stages ?? []).filter((s) => s.pipeline_id === config.pipelineId);

  const persist = async () => {
    if (!assistantId) return;
    await save.mutateAsync({
      id: assistantId,
      name: name.trim() || "Untitled assistant",
      greeting: config.greeting || null,
      persona: config.persona || null,
      language: config.language,
      timezone: config.businessHours.timezone,
      tags: config.tags,
      recording_enabled: config.recordingEnabled,
      crm_pipeline_id: config.pipelineId,
      crm_stage_id: config.stageId,
      default_owner_user_id: config.ownerUserId,
      voice_id: config.voiceId,
      config: config as unknown as Record<string, unknown>,
    });
    setDirty(false);
  };

  const doPublish = async () => {
    if (!assistantId) return;
    const blocking = checks.filter((c) => c.blocking && !c.ok && c.key === "setup");
    if (blocking.length) {
      toast.error("Finish the setup steps before publishing");
      return;
    }
    await persist();
    await publish.mutateAsync({
      assistantId,
      config: config as unknown as Record<string, unknown>,
      runtimePrompt,
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  }

  if (!assistant) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          This assistant no longer exists.
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate(`/dashboard/${workspaceId}/voice/assistants`)}>
              Back to assistants
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/dashboard/${workspaceId}/voice/assistants`)}
          >
            <ArrowLeft className="h-3 w-3" /> All assistants
          </button>
          <h1 className="truncate text-xl font-semibold tracking-tight">{name || "Untitled assistant"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <VoiceStatusBadge status={assistant.status} />
            <span>
              {assistant.published_version ? `Published version ${assistant.published_version}` : "Not published yet"}
            </span>
            {dirty && <span className="text-accent">Unsaved changes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setHistoryOpen(true)}>
            <History className="mr-1 h-4 w-4" /> Version history
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={persist} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> {save.isPending ? "Saving…" : "Save progress"}
          </Button>
          <Button size="sm" className="rounded-full" onClick={doPublish} disabled={publish.isPending}>
            <Sparkles className="mr-1 h-4 w-4" /> {publish.isPending ? "Publishing…" : "Publish version"}
          </Button>
        </div>
      </div>

      <VoiceSetupNotice compact />

      <div className="grid gap-5 lg:grid-cols-[240px,1fr]">
        {/* Step list */}
        <Card className="h-fit rounded-2xl lg:sticky lg:top-4">
          <CardContent className="space-y-1 p-3">
            {VOICE_WIZARD_STEPS.map((s, i) => {
              const done = isWizardStepComplete(s.key, config, name);
              const active = i === stepIndex;
              return (
                <button
                  key={s.key}
                  onClick={() => setStepIndex(i)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Step body */}
        <div className="space-y-4">
          <VoiceSection title={`${stepIndex + 1}. ${step.title}`} description={step.description}>
            <div className="space-y-4">
              {step.key === "identity" && (
                <>
                  <Field label="Assistant name" hint="Only you see this.">
                    <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} placeholder="Front desk receptionist" />
                  </Field>
                  <Field label="Business name" hint="What the assistant says it is answering for.">
                    <Input value={config.businessName} onChange={(e) => patch({ businessName: e.target.value })} placeholder="NexusFlo24" />
                  </Field>
                  <Field label="Role">
                    <Input value={config.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Telephone receptionist" />
                  </Field>
                </>
              )}

              {step.key === "voice" && (
                <>
                  <Field label="Language">
                    <Choice value={config.language} onChange={(v) => patch({ language: v })} options={VOICE_LANGUAGES} />
                  </Field>
                  <Field label="Voice">
                    <Choice value={config.voiceId} onChange={(v) => patch({ voiceId: v })} options={VOICE_VOICES} />
                  </Field>
                  <Field label="Speaking style">
                    <Choice
                      value={config.speakingStyle}
                      onChange={(v) => patch({ speakingStyle: v as VoiceAssistantConfig["speakingStyle"] })}
                      options={[
                        { value: "warm", label: "Warm" },
                        { value: "professional", label: "Professional" },
                        { value: "efficient", label: "Efficient" },
                        { value: "friendly", label: "Friendly" },
                      ]}
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">You can hear a sample once the calling service is connected.</p>
                </>
              )}

              {step.key === "greeting" && (
                <>
                  <Field label="Opening line" hint="The first thing every caller hears.">
                    <Textarea rows={3} value={config.greeting} onChange={(e) => patch({ greeting: e.target.value })}
                      placeholder="Good morning, thanks for calling NexusFlo24. How can I help you today?" />
                  </Field>
                  <Toggle
                    label="Ask who is calling"
                    hint="Confirms the caller's name early so it lands on the right record."
                    checked={config.callerIdentification}
                    onChange={(v) => patch({ callerIdentification: v })}
                  />
                </>
              )}

              {step.key === "persona" && (
                <>
                  <Field label="Tone and manner">
                    <Textarea rows={4} value={config.persona} onChange={(e) => patch({ persona: e.target.value })} />
                  </Field>
                  <Field label="Things it must never say" hint="Prices it cannot quote, promises it cannot make.">
                    <Textarea rows={3} value={config.neverSay} onChange={(e) => patch({ neverSay: e.target.value })}
                      placeholder="Never quote a final price. Never promise a same-day visit." />
                  </Field>
                </>
              )}

              {step.key === "availability" && (
                <>
                  <Field label="When does it answer?">
                    <Choice
                      value={config.businessHours.mode}
                      onChange={(v) => patch({ businessHours: { ...config.businessHours, mode: v as "always" | "hours" } })}
                      options={[{ value: "always", label: "Any time, day or night" }, { value: "hours", label: "Only during set hours" }]}
                    />
                  </Field>
                  <Field label="Time zone">
                    <Input value={config.businessHours.timezone}
                      onChange={(e) => patch({ businessHours: { ...config.businessHours, timezone: e.target.value } })} />
                  </Field>
                  {config.businessHours.mode === "hours" && (
                    <>
                      <div className="space-y-2">
                        {config.businessHours.days.map((d, i) => (
                          <div key={WEEKDAYS[i]} className="flex flex-wrap items-center gap-2">
                            <Switch
                              checked={d.enabled}
                              onCheckedChange={(v) => {
                                const days = [...config.businessHours.days];
                                days[i] = { ...d, enabled: v };
                                patch({ businessHours: { ...config.businessHours, days } });
                              }}
                              aria-label={WEEKDAYS[i]}
                            />
                            <span className="w-24 text-sm">{WEEKDAYS[i]}</span>
                            <Input type="time" className="h-8 w-28" value={d.from} disabled={!d.enabled}
                              onChange={(e) => {
                                const days = [...config.businessHours.days];
                                days[i] = { ...d, from: e.target.value };
                                patch({ businessHours: { ...config.businessHours, days } });
                              }} />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="time" className="h-8 w-28" value={d.to} disabled={!d.enabled}
                              onChange={(e) => {
                                const days = [...config.businessHours.days];
                                days[i] = { ...d, to: e.target.value };
                                patch({ businessHours: { ...config.businessHours, days } });
                              }} />
                          </div>
                        ))}
                      </div>
                      <Field label="Out of hours">
                        <Choice
                          value={config.businessHours.outOfHoursBehaviour}
                          onChange={(v) => patch({ businessHours: { ...config.businessHours, outOfHoursBehaviour: v as any } })}
                          options={[
                            { value: "take_message", label: "Take a message and promise a call back" },
                            { value: "voicemail", label: "Offer voicemail" },
                            { value: "transfer", label: "Offer to transfer" },
                          ]}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}

              {step.key === "services" && (
                <>
                  <Field label="Services it can discuss">
                    <ChipListEditor value={config.services} onChange={(v) => patch({ services: v })}
                      placeholder="e.g. Home and welfare checks" emptyHint="Add at least one service." />
                  </Field>
                  <Field label="Other topics it may cover" hint="Optional.">
                    <ChipListEditor value={config.topics} onChange={(v) => patch({ topics: v })} placeholder="e.g. Opening hours" />
                  </Field>
                </>
              )}

              {step.key === "intake" && (
                <Field label="Details to capture from every caller">
                  <ChipListEditor value={config.intakeQuestions} onChange={(v) => patch({ intakeQuestions: v })}
                    placeholder="e.g. Postcode" emptyHint="Add at least one detail." />
                </Field>
              )}

              {step.key === "booking" && (
                <>
                  <Toggle label="Can book appointments" hint="It checks your real availability before offering a time."
                    checked={config.bookingEnabled} onChange={(v) => patch({ bookingEnabled: v })} />
                  {config.bookingEnabled && (
                    <>
                      <Field label="Booking page">
                        {bookingPages.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No booking pages yet — create one under Bookings first.</p>
                        ) : (
                          <Choice value={config.bookingPageId ?? ""} onChange={(v) => patch({ bookingPageId: v })}
                            options={bookingPages.map((p) => ({ value: p.id, label: p.name }))} />
                        )}
                      </Field>
                      <Field label="Send the confirmation by">
                        <Choice
                          value={config.bookingConfirmationChannel}
                          onChange={(v) => patch({ bookingConfirmationChannel: v as any })}
                          options={[
                            { value: "email", label: "Email" },
                            { value: "sms", label: "SMS" },
                            { value: "whatsapp", label: "WhatsApp" },
                            { value: "none", label: "No confirmation" },
                          ]}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}

              {step.key === "transfer" && (
                <>
                  <Toggle label="Can transfer to a person" checked={config.transferEnabled}
                    onChange={(v) => patch({ transferEnabled: v })} />
                  {config.transferEnabled && (
                    <Field label="Transfer number">
                      <Input value={config.transferNumber} onChange={(e) => patch({ transferNumber: e.target.value })}
                        placeholder="+44 20 1234 5678" />
                    </Field>
                  )}
                  <Field label="Phrases that mean 'get me a person'">
                    <ChipListEditor value={config.escalationPhrases} onChange={(v) => patch({ escalationPhrases: v })}
                      placeholder="e.g. speak to a manager" />
                  </Field>
                </>
              )}

              {step.key === "crm" && (
                <>
                  <Field label="Pipeline">
                    <Choice
                      value={config.pipelineId ?? ""}
                      onChange={(v) => patch({ pipelineId: v, stageId: null })}
                      options={(pipelineData?.pipelines ?? []).map((p) => ({ value: p.id, label: p.name }))}
                    />
                  </Field>
                  <Field label="Stage new calls land in">
                    <Choice
                      value={config.stageId ?? ""}
                      onChange={(v) => patch({ stageId: v })}
                      options={stages.map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </Field>
                  <Field label="Owner" hint="Who follows up.">
                    <Choice
                      value={config.ownerUserId ?? ""}
                      onChange={(v) => patch({ ownerUserId: v })}
                      options={hosts.map((h) => ({ value: h.user_id, label: h.name }))}
                    />
                  </Field>
                  <Field label="Tags applied to the contact">
                    <ChipListEditor value={config.tags} onChange={(v) => patch({ tags: v })} placeholder="e.g. Phone enquiry" />
                  </Field>
                  <Toggle label="Open an opportunity for each new caller" checked={config.createDeal}
                    onChange={(v) => patch({ createDeal: v })} />
                </>
              )}

              {step.key === "compliance" && (
                <>
                  <Toggle
                    label="Record calls for this assistant"
                    hint="Off by default. Callers hear the announcement below before the conversation begins."
                    checked={config.recordingEnabled}
                    onChange={(v) => patch({ recordingEnabled: v })}
                  />
                  {config.recordingEnabled && (
                    <Field label="Recording announcement">
                      <Textarea rows={2} value={config.recordingAnnouncement}
                        onChange={(e) => patch({ recordingAnnouncement: e.target.value })} />
                    </Field>
                  )}
                  <Field label="Disclaimer it must state" hint="For example, that this is not an emergency service.">
                    <Textarea rows={2} value={config.emergencyDisclaimer}
                      onChange={(e) => patch({ emergencyDisclaimer: e.target.value })}
                      placeholder="We are not an emergency service. In an emergency please call 999." />
                  </Field>
                </>
              )}

              {step.key === "review" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {checks.map((c) => (
                      <div key={c.key} className="flex items-start gap-2 rounded-xl border p-3">
                        <span className={`mt-0.5 ${c.ok ? "text-primary" : c.blocking ? "text-destructive" : "text-muted-foreground"}`}>
                          {c.ok ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {c.label}
                            {!c.ok && !c.blocking && <span className="ml-2 text-xs text-muted-foreground">optional</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Field label="Status">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={assistant.status}
                        onValueChange={(status) => {
                          if (status === "active" && !activationReady) {
                            toast.error("This assistant cannot go live until every required item above is ticked");
                            return;
                          }
                          updateAssistant.mutate({ id: assistant.id, status });
                        }}
                      >
                        <SelectTrigger className="h-9 w-48 rounded-full text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[70]">
                          {VOICE_ASSISTANT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize"
                              disabled={s === "active" && !activationReady}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!activationReady && (
                        <span className="text-xs text-muted-foreground">Going live stays locked until the required items are ticked.</span>
                      )}
                    </div>
                  </Field>

                  <Field label="Instructions the assistant will follow" hint="Generated from your answers — it is not typed by hand.">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs leading-relaxed">
                      {runtimePrompt}
                    </pre>
                  </Field>
                </div>
              )}
            </div>
          </VoiceSection>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={persist} disabled={save.isPending}>Save progress</Button>
              <Button
                size="sm"
                disabled={stepIndex === VOICE_WIZARD_STEPS.length - 1}
                onClick={async () => { await persist(); setStepIndex((i) => Math.min(i + 1, VOICE_WIZARD_STEPS.length - 1)); }}
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="z-[70] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>Each publish saves a snapshot you can restore.</DialogDescription>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Version {v.version}
                      {assistant.published_version === v.version && (
                        <Badge variant="secondary" className="ml-2">Current</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.published_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="secondary" className="rounded-full"
                    disabled={rollback.isPending || assistant.published_version === v.version}
                    onClick={async () => {
                      await rollback.mutateAsync({ assistantId: assistant.id, version: v.version });
                      setHistoryOpen(false);
                    }}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Choice({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
      <SelectContent className="z-[70]">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nothing to choose from yet.</div>
        ) : options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
