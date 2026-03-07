import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check, Unlink } from "lucide-react";
import { useGoogleCalendarStatus, useGoogleCalendarConnect } from "@/hooks/useGoogleCalendar";
import type { BookingPage } from "@/hooks/useBookings";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Africa/Lagos", "Africa/Johannesburg",
];

const DEFAULT_AVAILABILITY: Record<string, { start: string; end: string }[]> = {
  mon: [{ start: "09:00", end: "17:00" }],
  tue: [{ start: "09:00", end: "17:00" }],
  wed: [{ start: "09:00", end: "17:00" }],
  thu: [{ start: "09:00", end: "17:00" }],
  fri: [{ start: "09:00", end: "17:00" }],
  sat: [],
  sun: [],
};

interface Props {
  initial?: Partial<BookingPage>;
  onSubmit: (data: Partial<BookingPage>) => void;
  loading?: boolean;
  publicUrl?: string;
  workspaceId?: string;
}

export default function BookingPageForm({ initial, onSubmit, loading, publicUrl, workspaceId }: Props) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [duration, setDuration] = useState(initial?.duration_minutes || 30);
  const [buffer, setBuffer] = useState(initial?.buffer_minutes || 15);
  const [maxDays, setMaxDays] = useState(initial?.max_days_ahead || 30);
  const [timezone, setTimezone] = useState(initial?.timezone || "UTC");
  const [color, setColor] = useState(initial?.color || "#D4AF37");
  const [availability, setAvailability] = useState<Record<string, { start: string; end: string }[]>>(
    (initial?.availability as any) || DEFAULT_AVAILABILITY
  );

  const { data: gcalStatus } = useGoogleCalendarStatus(initial?.id);
  const { connect, disconnect } = useGoogleCalendarConnect();

  const handleSlotChange = (day: string, idx: number, field: "start" | "end", value: string) => {
    setAvailability((prev) => {
      const updated = { ...prev };
      updated[day] = [...(updated[day] || [])];
      updated[day][idx] = { ...updated[day][idx], [field]: value };
      return updated;
    });
  };

  const addSlot = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "17:00" }],
    }));
  };

  const removeSlot = (day: string, idx: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      duration_minutes: duration,
      buffer_minutes: buffer,
      max_days_ahead: maxDays,
      timezone,
      color,
      availability,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="30-Min Discovery Call" required />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[15, 30, 45, 60, 90].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this meeting is about..." rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Buffer (minutes)</Label>
          <Input type="number" min={0} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} />
        </div>
        <div>
          <Label>Max days ahead</Label>
          <Input type="number" min={1} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} />
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Brand Color</Label>
        <div className="flex items-center gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 rounded border cursor-pointer" />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>

      {/* Availability Grid */}
      <div>
        <Label className="mb-2 block">Weekly Availability</Label>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-start gap-3">
              <span className="w-24 shrink-0 pt-2 text-sm font-medium">{day.label}</span>
              <div className="flex-1 space-y-1.5">
                {(availability[day.key] || []).length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Unavailable</span>
                )}
                {(availability[day.key] || []).map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input type="time" value={slot.start} onChange={(e) => handleSlotChange(day.key, idx, "start", e.target.value)} className="w-28" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={slot.end} onChange={(e) => handleSlotChange(day.key, idx, "end", e.target.value)} className="w-28" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(day.key, idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => addSlot(day.key)} className="shrink-0 mt-0.5">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {publicUrl && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <Label className="text-xs text-muted-foreground">Public Link</Label>
          <p className="mt-0.5 text-sm font-medium break-all">{publicUrl}</p>
        </div>
      )}

      {/* Google Calendar Integration */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🗓 Google Calendar</span>
            {gcalStatus?.connected && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
          </div>
          {initial?.id && workspaceId ? (
            gcalStatus?.connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => disconnect(initial.id!, gcalStatus.tokenId)}
              >
                <Unlink className="mr-1 h-3 w-3" /> Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => connect(workspaceId, initial.id!)}
              >
                Connect Calendar
              </Button>
            )
          ) : (
            <span className="text-xs text-muted-foreground">Save first to connect</span>
          )}
        </div>
        {gcalStatus?.connected && (
          <p className="mt-1 text-xs text-muted-foreground">
            New bookings will create calendar events and busy times will block availability.
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading || !name} className="w-full">
        {loading ? "Saving..." : initial?.id ? "Update Booking Page" : "Create Booking Page"}
      </Button>
    </form>
  );
}
