import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Rocket, Building2, Briefcase, Users, Target, Upload, Mail, CalendarDays,
  UserPlus, Columns3, PartyPopper, Check, ChevronLeft, ChevronRight, Clock,
  Loader2, Sparkles, Plus, X
} from "lucide-react";
import {
  ONBOARDING_STEPS, TOTAL_STEPS, useOnboarding, useSaveOnboarding, useGettingStarted, OnboardingAnswers,
} from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";


const INDUSTRIES = [
  "Coaching & Creators", "Marketing Agency", "E-commerce", "Professional Services",
  "Real Estate", "Health & Wellness", "Education & Training", "Finance & Insurance",
  "Hospitality & Events", "Technology / SaaS", "Other",
];

const TEAM_SIZES = ["Just me", "2–5 people", "6–20 people", "21–50 people", "50+ people"];

const GOALS = [
  { id: "capture_leads", label: "Capture more leads", desc: "Forms, funnels and landing pages" },
  { id: "follow_up", label: "Automate follow-up", desc: "Email, WhatsApp and SMS sequences" },
  { id: "close_deals", label: "Close more deals", desc: "Pipeline, tasks and AI sales closer" },
  { id: "book_meetings", label: "Book more meetings", desc: "Booking pages and reminders" },
  { id: "retain_customers", label: "Retain customers", desc: "Nurture campaigns and re-engagement" },
  { id: "measure", label: "Measure performance", desc: "Analytics and revenue reporting" },
];

const DEFAULT_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];

interface Props {
  workspaceId: string;
  /** Embedded mode is used inside Settings → Onboarding. */
  embedded?: boolean;
}

const OnboardingWizard = ({ workspaceId, embedded = false }: Props) => {
  const navigate = useNavigate();
  const { data: record, isLoading } = useOnboarding(workspaceId);
  const save = useSaveOnboarding(workspaceId);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [stageInput, setStageInput] = useState("");

  useEffect(() => {
    if (isLoading || hydrated) return;
    if (record) {
      setAnswers(record.answers ?? {});
      setSkipped(record.skipped_steps ?? []);
      setStep(Math.min(record.current_step ?? 0, TOTAL_STEPS - 1));
    }
    setHydrated(true);
  }, [record, isLoading, hydrated]);

  const current = ONBOARDING_STEPS[step];
  const percent = Math.round((step / (TOTAL_STEPS - 1)) * 100);
  const stages = (answers.pipeline_stages as string[] | undefined) ?? DEFAULT_STAGES;
  const goals = (answers.goals as string[] | undefined) ?? [];

  const setAnswer = (key: string, value: unknown) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const persist = async (patch: Partial<{ current_step: number; completed: boolean; completed_at: string | null }> = {}) => {
    try {
      await save.mutateAsync({ answers, skipped_steps: skipped, current_step: step, ...patch } as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your progress.");
      throw e;
    }
  };

  const goTo = async (next: number) => {
    const clamped = Math.max(0, Math.min(next, TOTAL_STEPS - 1));
    setStep(clamped);
    try { await persist({ current_step: clamped }); } catch { /* toast already shown */ }
  };

  const handleSkip = async () => {
    if (!skipped.includes(current.id)) setSkipped((s) => [...s, current.id]);
    await goTo(step + 1);
  };

  const handleSaveLater = async () => {
    try {
      await persist({ current_step: step });
      toast.success("Progress saved — pick up where you left off any time.");
      if (!embedded) navigate(`/dashboard/${workspaceId}/overview`);
    } catch { /* noop */ }
  };

  const handleFinish = async () => {
    try {
      await persist({ current_step: TOTAL_STEPS - 1, completed: true, completed_at: new Date().toISOString() });
      setCelebrate(true);
    } catch { /* noop */ }
  };

  const canContinue = useMemo(() => {
    if (current.id === "business") return Boolean((answers.business_name as string)?.trim());
    if (current.id === "industry") return Boolean(answers.industry);
    if (current.id === "team_size") return Boolean(answers.team_size);
    if (current.id === "goals") return goals.length > 0;
    return true;
  }, [current.id, answers, goals.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (celebrate) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center sm:py-16">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-accent/15">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <PartyPopper className="relative h-11 w-11 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">You're all set{answers.business_name ? `, ${answers.business_name}` : ""} 🎉</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          Your workspace is configured. We've built a Getting Started checklist on your dashboard so you can
          finish the remaining setup at your own pace.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="w-full gap-2 sm:w-auto"
            onClick={() => {
              sessionStorage.setItem("nexusflo_start_tour", "1");
              navigate(`/dashboard/${workspaceId}/overview`);
            }}
          >
            <Rocket className="h-4 w-4" /> Go to Dashboard
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => { setCelebrate(false); setStep(0); }}>
            Review my answers
          </Button>
        </div>
      </div>
    );
  }

  /* ── Step bodies ───────────────────────────────────────── */
  const body = () => {
    switch (current.id) {
      case "welcome":
        return (
          <div className="space-y-5">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent/10 p-5 sm:p-6">
              <Sparkles className="h-6 w-6 text-accent" />
              <h3 className="mt-3 text-lg font-semibold text-foreground">Let's get your growth engine running</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                In under five minutes we'll set up your CRM, sending channels, calendar and first pipeline —
                so leads are captured, nurtured and converted automatically.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Target, t: "Capture", d: "Forms, funnels and lead ads" },
                { icon: Mail, t: "Nurture", d: "Email, WhatsApp and SMS" },
                { icon: Rocket, t: "Convert", d: "Pipeline, bookings, analytics" },
              ].map((c) => (
                <div key={c.t} className="rounded-lg border bg-background p-4">
                  <c.icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{c.t}</p>
                  <p className="text-xs text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "business":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ob-business">Business name</Label>
              <Input id="ob-business" value={(answers.business_name as string) ?? ""} placeholder="NexusFlo Ltd"
                onChange={(e) => setAnswer("business_name", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ob-website">Website (optional)</Label>
              <Input id="ob-website" value={(answers.website as string) ?? ""} placeholder="https://example.com"
                onChange={(e) => setAnswer("website", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ob-country">Country (optional)</Label>
              <Input id="ob-country" value={(answers.country as string) ?? ""} placeholder="United Kingdom"
                onChange={(e) => setAnswer("country", e.target.value)} className="mt-1.5" />
            </div>
          </div>
        );

      case "industry":
        return (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((i) => {
              const active = answers.industry === i;
              return (
                <button key={i} type="button" onClick={() => setAnswer("industry", i)}
                  className={`rounded-lg border p-3 text-left text-sm font-medium transition-all ${
                    active ? "border-accent bg-accent/10 text-foreground shadow-sm" : "bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  }`}>
                  <span className="flex items-center justify-between gap-2">
                    {i}
                    {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </span>
                </button>
              );
            })}
          </div>
        );

      case "team_size":
        return (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TEAM_SIZES.map((t) => {
              const active = answers.team_size === t;
              return (
                <button key={t} type="button" onClick={() => setAnswer("team_size", t)}
                  className={`flex items-center justify-between rounded-lg border p-4 text-left text-sm font-medium transition-all ${
                    active ? "border-accent bg-accent/10 text-foreground shadow-sm" : "bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  }`}>
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{t}</span>
                  {active && <Check className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
          </div>
        );

      case "goals":
        return (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {GOALS.map((g) => {
              const active = goals.includes(g.id);
              return (
                <button key={g.id} type="button"
                  onClick={() => setAnswer("goals", active ? goals.filter((x) => x !== g.id) : [...goals, g.id])}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    active ? "border-accent bg-accent/10 shadow-sm" : "bg-background hover:border-accent/50"
                  }`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{g.label}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{g.desc}</span>
                </button>
              );
            })}
          </div>
        );

      case "contacts":
        return (
          <ActionStep
            icon={Upload}
            title="Import your contacts"
            copy="Upload a CSV with names, emails, phone numbers, source and tags. Duplicates are merged automatically by email, then phone."
            actionLabel="Open CSV importer"
            onAction={() => window.open(`/dashboard/${workspaceId}/leads`, "_blank")}
            done={Boolean(answers.contacts_imported)}
            onToggleDone={() => setAnswer("contacts_imported", !answers.contacts_imported)}
            doneLabel="I've imported my contacts"
          />
        );

      case "email":
        return (
          <ActionStep
            icon={Mail}
            title="Connect your sending email"
            copy="Add a verified sender profile so campaigns, automations and booking confirmations send from your own domain."
            actionLabel="Open sender settings"
            onAction={() => window.open(`/dashboard/${workspaceId}/settings/senders`, "_blank")}
            done={Boolean(answers.email_connected)}
            onToggleDone={() => setAnswer("email_connected", !answers.email_connected)}
            doneLabel="My sending email is connected"
          />
        );

      case "calendar":
        return (
          <ActionStep
            icon={CalendarDays}
            title="Connect your calendar"
            copy="Link Google Calendar to a booking page so availability stays in sync and confirmed meetings appear in your diary."
            actionLabel="Open bookings"
            onAction={() => window.open(`/dashboard/${workspaceId}/bookings`, "_blank")}
            done={Boolean(answers.calendar_connected)}
            onToggleDone={() => setAnswer("calendar_connected", !answers.calendar_connected)}
            doneLabel="My calendar is connected"
          />
        );

      case "team":
        return (
          <ActionStep
            icon={UserPlus}
            title="Invite your team"
            copy="Invite colleagues by email and choose their role. They'll get access to the CRM, campaigns and shared inbox."
            actionLabel="Open team settings"
            onAction={() => window.open(`/dashboard/${workspaceId}/settings/team`, "_blank")}
            done={Boolean(answers.team_invited)}
            onToggleDone={() => setAnswer("team_invited", !answers.team_invited)}
            doneLabel="I've invited my team"
          />
        );

      case "pipeline":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                These stages appear as columns in your CRM pipeline view. Start with the defaults or tailor them to your sales process.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {stages.map((s, i) => (
                <span key={`${s}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium text-foreground">
                  <Columns3 className="h-3.5 w-3.5 text-accent" />
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} className="text-muted-foreground hover:text-destructive"
                    onClick={() => setAnswer("pipeline_stages", stages.filter((_, idx) => idx !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={stageInput} placeholder="Add a stage, e.g. Negotiation"
                onChange={(e) => setStageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && stageInput.trim()) {
                    e.preventDefault();
                    setAnswer("pipeline_stages", [...stages, stageInput.trim()]);
                    setStageInput("");
                  }
                }} />
              <Button type="button" variant="outline" className="gap-1.5"
                onClick={() => {
                  if (!stageInput.trim()) return;
                  setAnswer("pipeline_stages", [...stages, stageInput.trim()]);
                  setStageInput("");
                }}>
                <Plus className="h-4 w-4" /> Add stage
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="h-4 w-4 accent-current"
                checked={Boolean(answers.pipeline_configured)}
                onChange={(e) => setAnswer("pipeline_configured", e.target.checked)} />
              These stages match how my team sells
            </label>
          </div>
        );

      case "launch":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent/10 p-5">
              <h3 className="text-base font-semibold text-foreground">Review your setup</h3>
              <p className="mt-1 text-sm text-muted-foreground">Anything can be changed later in Settings → Onboarding.</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Summary label="Business" value={(answers.business_name as string) || "—"} />
              <Summary label="Industry" value={(answers.industry as string) || "—"} />
              <Summary label="Team size" value={(answers.team_size as string) || "—"} />
              <Summary label="Goals" value={goals.length ? `${goals.length} selected` : "—"} />
              <Summary label="Contacts imported" value={answers.contacts_imported ? "Yes" : "Not yet"} />
              <Summary label="Email connected" value={answers.email_connected ? "Yes" : "Not yet"} />
              <Summary label="Calendar connected" value={answers.calendar_connected ? "Yes" : "Not yet"} />
              <Summary label="Pipeline stages" value={stages.join(" → ")} />
            </dl>
          </div>
        );

      default:
        return null;
    }
  };

  const stepIcon = [Rocket, Building2, Briefcase, Users, Target, Upload, Mail, CalendarDays, UserPlus, Columns3, PartyPopper][step] ?? Rocket;
  const StepIcon = stepIcon;

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-3xl px-4 py-6 sm:py-10"}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
          <Badge variant="secondary" className="text-xs">{percent}% complete</Badge>
        </div>
        <Progress value={percent} className="mt-2 h-2" />
        <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
          {ONBOARDING_STEPS.map((s, i) => (
            <button key={s.id} type="button" onClick={() => goTo(i)}
              title={s.title}
              className={`h-1.5 flex-1 min-w-[18px] rounded-full transition-colors ${
                i < step ? "bg-accent" : i === step ? "bg-primary" : "bg-muted"
              }`} />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <StepIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">{current.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
          </div>
        </div>

        <div className="mt-6">{body()}</div>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="gap-1.5 sm:w-auto" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" className="gap-1.5" onClick={handleSaveLater} disabled={save.isPending}>
            <Clock className="h-4 w-4" /> Save &amp; continue later
          </Button>
          {step < TOTAL_STEPS - 1 && (
            <Button variant="ghost" onClick={handleSkip} disabled={save.isPending}>Skip</Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button className="gap-1.5" onClick={() => goTo(step + 1)} disabled={!canContinue || save.isPending}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="gap-1.5" onClick={handleFinish} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Launch dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Summary = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-background p-3">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
  </div>
);

const ActionStep = ({
  icon: Icon, title, copy, actionLabel, onAction, done, onToggleDone, doneLabel,
}: {
  icon: any; title: string; copy: string; actionLabel: string; onAction: () => void;
  done: boolean; onToggleDone: () => void; doneLabel: string;
}) => (
  <div className="space-y-4">
    <div className="rounded-xl border bg-muted/40 p-5">
      <Icon className="h-5 w-5 text-accent" />
      <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      <Button variant="outline" className="mt-4" onClick={onAction}>{actionLabel}</Button>
    </div>
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" className="h-4 w-4 accent-current" checked={done} onChange={onToggleDone} />
      {doneLabel}
    </label>
    <p className="text-xs text-muted-foreground">
      Not ready? Choose <span className="font-medium">Skip</span> — it will stay on your Getting Started checklist.
    </p>
  </div>
);

export default OnboardingWizard;
