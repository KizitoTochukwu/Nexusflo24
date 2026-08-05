import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { AppointmentType, BookingQuestion, ReminderStep } from "@/hooks/useAppointmentTypes";
import { publishBlockers } from "@/hooks/useAppointmentTypes";
import { useAvailabilitySchedules } from "@/hooks/useAvailability";
import { useBookingTeams, useWorkspaceHosts } from "@/hooks/useBookingTeams";
import type { BookingPage } from "@/hooks/useBookings";

const NONE = "__none__";

interface Props {
  workspaceId: string;
  pages: BookingPage[];
  initial?: Partial<AppointmentType>;
  loading?: boolean;
  onSubmit: (values: Partial<AppointmentType>) => void;
}

export default function AppointmentTypeForm({ workspaceId, pages, initial, loading, onSubmit }: Props) {
  const { data: schedules = [] } = useAvailabilitySchedules(workspaceId);
  const { data: teams = [] } = useBookingTeams(workspaceId);
  const { data: hosts = [] } = useWorkspaceHosts(workspaceId);

  const [v, setV] = useState<Partial<AppointmentType>>({
    name: "",
    description: "",
    kind: "one_to_one",
    duration_minutes: 30,
    slot_interval_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    min_notice_minutes: 60,
    max_days_ahead: 60,
    capacity: 1,
    color: "#0B1F3B",
    location_type: "google_meet",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    questions: [],
    reminder_sequence: [
      { channel: "email", audience: "guest", offset_minutes: 1440 },
      { channel: "email", audience: "guest", offset_minutes: 60 },
    ],
    cancel_cutoff_minutes: 60,
    reschedule_cutoff_minutes: 60,
    max_reschedules: 3,
    require_confirmation: false,
    is_published: false,
    ...initial,
  });

  const set = <K extends keyof AppointmentType>(k: K, val: AppointmentType[K] | null) =>
    setV((p) => ({ ...p, [k]: val as any }));

  const blockers = publishBlockers(v);
  const questions = (v.questions ?? []) as BookingQuestion[];
  const reminders = (v.reminder_sequence ?? []) as ReminderStep[];

  const addQuestion = () =>
    set("questions", [...questions, { id: crypto.randomUUID(), label: "", type: "text", required: false }] as any);
  const updateQuestion = (i: number, patch: Partial<BookingQuestion>) =>
    set("questions", questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) as any);
  const removeQuestion = (i: number) => set("questions", questions.filter((_, idx) => idx !== i) as any);

  const addReminder = () =>
    set("reminder_sequence", [...reminders, { channel: "email", audience: "guest", offset_minutes: 60 }] as any);
  const updateReminder = (i: number, patch: Partial<ReminderStep>) =>
    set("reminder_sequence", reminders.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) as any);
  const removeReminder = (i: number) => set("reminder_sequence", reminders.filter((_, idx) => idx !== i) as any);

  const handleSubmit = (publish: boolean) => {
    onSubmit({ ...v, workspace_id: workspaceId, is_published: publish ? true : v.is_published });
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="basics">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="at-name">Name</Label>
            <Input id="at-name" value={v.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Discovery call" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-desc">Description shown to guests</Label>
            <Textarea id="at-desc" rows={3} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Meeting kind</Label>
              <Select value={v.kind} onValueChange={(k) => set("kind", k as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="one_to_one">One-to-one</SelectItem>
                  <SelectItem value="group">Group (many guests, one slot)</SelectItem>
                  <SelectItem value="round_robin">Round-robin (rotate hosts)</SelectItem>
                  <SelectItem value="collective">Collective (all hosts attend)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Booking page</Label>
              <Select
                value={v.booking_page_id ?? NONE}
                onValueChange={(id) => set("booking_page_id", id === NONE ? null : id)}
              >
                <SelectTrigger><SelectValue placeholder="Choose a page" /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={v.location_type} onValueChange={(t) => set("location_type", t)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="google_meet">Google Meet (auto link)</SelectItem>
                  <SelectItem value="phone">Phone call</SelectItem>
                  <SelectItem value="in_person">In person</SelectItem>
                  <SelectItem value="custom">Custom link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {v.location_type !== "google_meet" && (
              <div className="space-y-1.5">
                <Label>Location details</Label>
                <Input value={v.location_value ?? ""} onChange={(e) => set("location_value", e.target.value)} placeholder="Address, number or URL" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Input type="color" className="h-10 w-20 p-1" value={v.color ?? "#0B1F3B"} onChange={(e) => set("color", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Duration (minutes)" value={v.duration_minutes} onChange={(n) => set("duration_minutes", n)} />
            <NumberField label="Slot interval (minutes)" value={v.slot_interval_minutes} onChange={(n) => set("slot_interval_minutes", n)} />
            <NumberField label="Buffer before (minutes)" value={v.buffer_before_minutes} onChange={(n) => set("buffer_before_minutes", n)} />
            <NumberField label="Buffer after (minutes)" value={v.buffer_after_minutes} onChange={(n) => set("buffer_after_minutes", n)} />
            <NumberField label="Minimum notice (minutes)" value={v.min_notice_minutes} onChange={(n) => set("min_notice_minutes", n)} />
            <NumberField label="Bookable days ahead" value={v.max_days_ahead} onChange={(n) => set("max_days_ahead", n)} />
            <NumberField label="Max bookings per day (blank = unlimited)" value={v.max_per_day ?? undefined} allowEmpty onChange={(n) => set("max_per_day", (n ?? null) as any)} />
            {v.kind === "group" && (
              <NumberField label="Capacity (guests per slot)" value={v.capacity} onChange={(n) => set("capacity", n)} />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Availability schedule</Label>
            <Select
              value={v.availability_schedule_id ?? NONE}
              onValueChange={(id) => set("availability_schedule_id", id === NONE ? null : id)}
            >
              <SelectTrigger><SelectValue placeholder="Choose a schedule" /></SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value={NONE}>None selected</SelectItem>
                {schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.timezone}</SelectItem>)}
              </SelectContent>
            </Select>
            {schedules.length === 0 && (
              <p className="text-xs text-muted-foreground">Create one under Availability first.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hosts" className="mt-4 space-y-4">
          {(v.kind === "round_robin" || v.kind === "collective") ? (
            <div className="space-y-1.5">
              <Label>Booking team</Label>
              <Select value={v.team_id ?? NONE} onValueChange={(id) => set("team_id", id === NONE ? null : id)}>
                <SelectTrigger><SelectValue placeholder="Choose a team" /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value={NONE}>None selected</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Hosts and rotation rules are managed under Team Scheduling.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Host</Label>
              <Select value={v.host_user_id ?? NONE} onValueChange={(id) => set("host_user_id", id === NONE ? null : id)}>
                <SelectTrigger><SelectValue placeholder="Choose a host" /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value={NONE}>None selected</SelectItem>
                  {hosts.map((h) => <SelectItem key={h.user_id} value={h.user_id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="mt-4 space-y-3">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Name, email and phone are always collected. Add anything else you need here.</p>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border/60 p-3 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Question label" value={q.label} onChange={(e) => updateQuestion(i, { label: e.target.value })} />
                <Select value={q.type} onValueChange={(t) => updateQuestion(i, { type: t as any })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="text">Short text</SelectItem>
                    <SelectItem value="textarea">Long text</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(i)} aria-label="Remove question">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {q.type === "select" && (
                <Input
                  placeholder="Options, comma separated"
                  value={(q.options ?? []).join(", ")}
                  onChange={(e) => updateQuestion(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              )}
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={q.required} onCheckedChange={(c) => updateQuestion(i, { required: c })} />
                Required
              </label>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add question
          </Button>
        </TabsContent>

        <TabsContent value="reminders" className="mt-4 space-y-3">
          {reminders.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-3">
              <Select value={r.channel} onValueChange={(c) => updateReminder(i, { channel: c as any })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <Select value={r.audience} onValueChange={(a) => updateReminder(i, { audience: a as any })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-[110px]"
                value={r.offset_minutes}
                onChange={(e) => updateReminder(i, { offset_minutes: Number(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">minutes before</span>
              <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => removeReminder(i)} aria-label="Remove reminder">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addReminder}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add reminder
          </Button>
          <p className="text-xs text-muted-foreground">
            SMS and WhatsApp reminders use the workspace sender and consume message credits.
          </p>
        </TabsContent>

        <TabsContent value="policies" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Cancellation cut-off (minutes before)" value={v.cancel_cutoff_minutes} onChange={(n) => set("cancel_cutoff_minutes", n)} />
            <NumberField label="Reschedule cut-off (minutes before)" value={v.reschedule_cutoff_minutes} onChange={(n) => set("reschedule_cutoff_minutes", n)} />
            <NumberField label="Maximum reschedules" value={v.max_reschedules} onChange={(n) => set("max_reschedules", n)} />
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <span className="text-sm">
              <span className="font-medium">Require host confirmation</span>
              <span className="block text-xs text-muted-foreground">Bookings arrive as pending until a host approves.</span>
            </span>
            <Switch checked={!!v.require_confirmation} onCheckedChange={(c) => set("require_confirmation", c)} />
          </label>
        </TabsContent>
      </Tabs>

      {blockers.length > 0 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">Not ready to publish</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {v.is_published ? <Badge className="bg-emerald-100 text-emerald-800">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading || !v.name?.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save draft
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={loading || blockers.length > 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save and publish
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, allowEmpty }: {
  label: string; value?: number; onChange: (n: number | undefined) => void; allowEmpty?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" && allowEmpty) return onChange(undefined);
          onChange(Number(raw));
        }}
      />
    </div>
  );
}
