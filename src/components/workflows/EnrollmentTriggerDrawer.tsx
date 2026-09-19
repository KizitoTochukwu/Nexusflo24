// Right-side drawer that configures a workflow's enrollment trigger.
// Persists trigger_* + filter_groups + reenrollment_config on the workflows row.
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, FlaskConical, Loader2, Sparkles } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ENROLLMENT_METHODS, TRIGGER_SOURCES, REENROLLMENT_MODES,
  findSource, findEvent, scopeFieldsFor, buildTriggerSummary, configurationStatus,
  triggerReadinessProblem, isMethodSupported,
  type EnrollmentObject,
} from "@/lib/workflows/triggerCatalog";
import ScopeValuePicker from "./ScopeValuePicker";
import FilterGroupBuilder, { type FilterGroup } from "./FilterGroupBuilder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EnrollmentTriggerPatch {
  enrollment_method: string;
  trigger_source: string | null;
  trigger_event: string | null;
  trigger_config: Record<string, any>;
  filter_groups: FilterGroup[];
  reenrollment_config: { mode: string; wait_amount?: number; wait_unit?: string };
  deduplication_key: string | null;
  trigger_summary: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workflow: any;
  enrollmentObject: EnrollmentObject;
  onSave: (patch: EnrollmentTriggerPatch) => Promise<void>;
  /** Which record type this drawer is editing. Defaults to "workflow" for back-compat. */
  recordKind?: "workflow" | "automation";
}

export default function EnrollmentTriggerDrawer({ open, onOpenChange, workflow, enrollmentObject, onSave, recordKind = "workflow" }: Props) {
  const [method, setMethod] = useState<string>(workflow?.enrollment_method || "event");
  const [source, setSource] = useState<string | null>(workflow?.trigger_source || null);
  const [event, setEvent] = useState<string | null>(workflow?.trigger_event || null);
  const [config, setConfig] = useState<Record<string, any>>(workflow?.trigger_config || {});
  const [filters, setFilters] = useState<FilterGroup[]>(workflow?.filter_groups || []);
  const [reMode, setReMode] = useState<string>(workflow?.reenrollment_config?.mode || "never");
  const [waitAmount, setWaitAmount] = useState<number>(workflow?.reenrollment_config?.wait_amount || 24);
  const [waitUnit, setWaitUnit] = useState<string>(workflow?.reenrollment_config?.wait_unit || "hours");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Reset when workflow changes / drawer reopens
  useEffect(() => {
    if (!open) return;
    setMethod(workflow?.enrollment_method || "event");
    setSource(workflow?.trigger_source || null);
    setEvent(workflow?.trigger_event || null);
    setConfig(workflow?.trigger_config || {});
    setFilters(workflow?.filter_groups || []);
    setReMode(workflow?.reenrollment_config?.mode || "never");
    setWaitAmount(workflow?.reenrollment_config?.wait_amount || 24);
    setWaitUnit(workflow?.reenrollment_config?.wait_unit || "hours");
    setTestResult(null);
  }, [open, workflow?.id]);

  const availableSources = useMemo(
    () => TRIGGER_SOURCES.filter((s) => s.objects.includes(enrollmentObject)),
    [enrollmentObject]
  );
  const srcDef = findSource(source);
  const evDef = findEvent(source, event);
  const scopeFields = scopeFieldsFor(source, event);

  // Meta default dedupe
  useEffect(() => {
    if (source === "meta_lead_ads" && event === "meta_lead_received" && reMode === "never") {
      setReMode("every_event");
    }
  }, [source, event]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = {
    enrollment_object_type: enrollmentObject,
    enrollment_method: method,
    trigger_source: source,
    trigger_event: event,
    trigger_config: config,
  };
  const summary = buildTriggerSummary({ ...draft, name: workflow?.name });
  const status = configurationStatus(draft);
  const problem = triggerReadinessProblem(draft);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dedup = evDef?.defaultDedupKey ?? null;
      await onSave({
        enrollment_method: method,
        trigger_source: source,
        trigger_event: event,
        trigger_config: config,
        filter_groups: filters,
        reenrollment_config: reMode === "after_wait"
          ? { mode: reMode, wait_amount: waitAmount, wait_unit: waitUnit }
          : { mode: reMode },
        deduplication_key: dedup,
        trigger_summary: summary,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!workflow?.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const body: Record<string, any> = {
        trigger_source: source,
        trigger_event: event,
        trigger_config: config,
        filter_groups: filters,
        record_kind: recordKind,
        workspace_id: workflow?.workspace_id,
      };
      if (recordKind === "automation") body.automation_id = workflow.id;
      else body.workflow_id = workflow.id;
      const { data, error } = await supabase.functions.invoke("test-workflow-trigger", { body });
      if (error) throw error;
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>Enrollment trigger</SheetTitle>
            <StatusBadge status={status} />
          </div>
          <SheetDescription>
            Decide which records enter this workflow and when.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Summary card */}
          <div className="rounded-md border bg-accent/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Trigger summary
            </div>
            <p className="text-foreground/90">{summary}</p>
          </div>

          {problem && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          {/* Step 1 – Enrollment method */}
          <Section title="1. Enrollment method">
            <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
              {ENROLLMENT_METHODS.map((m) => {
                const off = !isMethodSupported(m.key);
                return (
                  <label
                    key={m.key}
                    className={`flex items-start gap-2 rounded-md border p-2 ${
                      off ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/30"
                    }`}
                  >
                    <RadioGroupItem value={m.key} id={`m-${m.key}`} className="mt-0.5" disabled={off} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {m.label}
                        {off && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </Section>

          {/* Step 2 – Source */}
          <Section title="2. Trigger source">
            <div className="grid grid-cols-2 gap-2">
              {availableSources.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setSource(s.key); setEvent(null); setConfig({}); }}
                  className={`rounded-md border p-2 text-left text-xs transition-colors ${
                    source === s.key ? "border-accent bg-accent/10" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="font-medium text-foreground">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Step 3 – Event */}
          {srcDef && (
            <Section title="3. Trigger event">
              <div className="space-y-1.5">
                {srcDef.events.map((e) => {
                  const off = e.emitted !== true;
                  return (
                    <label
                      key={e.key}
                      className={`flex items-start gap-2 rounded-md border p-2 ${
                        off ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/30"
                      } ${event === e.key ? "border-accent bg-accent/5" : ""}`}
                    >
                      <input
                        type="radio" name="ev" checked={event === e.key} disabled={off}
                        onChange={() => setEvent(e.key)} className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {e.label}
                          {off && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                        </div>
                        {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Step 4 – Scope fields (dynamic) */}
          {event && scopeFields.length > 0 && (
            <Section title="4. Scope">
              <div className="space-y-2">
                {scopeFields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">
                      {f.label}
                      {f.required && <span className="ml-1 text-destructive">*</span>}
                    </Label>
                    <div className="mt-1">
                      <ScopeValuePicker
                        scopeKey={f.key}
                        label={f.label}
                        workspaceId={workflow?.workspace_id}
                        value={config[f.key]}
                        allowAny={f.allowAny !== false && !f.required}
                        pipelineId={
                          typeof config.pipeline === "object" ? config.pipeline?.id : config.pipeline
                        }
                        onChange={(v) => setConfig({ ...config, [f.key]: v })}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Leave a box on "Any value" to let every record through.
                </p>
              </div>
            </Section>
          )}

          {/* Step 5 – Additional filters */}
          {event && (
            <Section title="5. Additional filters">
              <FilterGroupBuilder value={filters} onChange={setFilters} propertySuggestions={["email", "phone", "full_name", "tags", "score", "source", "status", "company", "city", "country"]} />
            </Section>
          )}

          {/* Step 6 – Re-enrollment */}
          {event && (
            <Section title="6. Re-enrollment">
              <RadioGroup value={reMode} onValueChange={setReMode} className="space-y-2">
                {REENROLLMENT_MODES.map((r) => (
                  <label key={r.key} className="flex cursor-pointer items-start gap-2 rounded-md border p-2 hover:bg-muted/30">
                    <RadioGroupItem value={r.key} id={`re-${r.key}`} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
              {reMode === "after_wait" && (
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" value={waitAmount} min={1} onChange={(e) => setWaitAmount(Number(e.target.value))} className="h-8 w-24" />
                  <select value={waitUnit} onChange={(e) => setWaitUnit(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
              )}
              {evDef?.defaultDedupKey && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Duplicate protection: same <code className="text-xs">{evDef.defaultDedupKey}</code> won't re-run this workflow.
                </p>
              )}
            </Section>
          )}

          {/* Step 7 – Test */}
          {event && (
            <Section title="7. Test trigger">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="mr-1 h-3.5 w-3.5" />}
                Run test
              </Button>
              {testResult && (
                <div className="mt-2 rounded-md border bg-muted/20 p-2 text-xs">
                  {testResult.ok === false ? (
                    <p className="text-destructive">{testResult.error || "Test failed"}</p>
                  ) : (
                    <>
                      <p className="font-medium">{testResult.passed ? "✓ Test passed" : "✗ Filters did not pass"}</p>
                      {testResult.sample_payload && (
                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-background p-2 text-[10px]">
                          {JSON.stringify(testResult.sample_payload, null, 2)}
                        </pre>
                      )}
                      {testResult.mapped_fields && (
                        <div className="mt-1">
                          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Mapped fields</div>
                          <pre className="mt-1 rounded bg-background p-2 text-[10px]">
                            {JSON.stringify(testResult.mapped_fields, null, 2)}
                          </pre>
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground italic">Live workflow actions were not executed.</p>
                    </>
                  )}
                </div>
              )}
            </Section>
          )}
        </div>

        <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !source || !event} className="flex-1">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save trigger
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{title}</h4>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: "configured" | "incomplete" | "error" }) {
  if (status === "configured") return <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Configured</Badge>;
  if (status === "error") return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>;
  return <Badge variant="outline" className="gap-1 border-amber-500/60 text-amber-700"><AlertCircle className="h-3 w-3" /> Incomplete</Badge>;
}
