import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check, Unlink, Mail, Video, MapPin, MessageCircle } from "lucide-react";
import { useGoogleCalendarStatus, useGoogleCalendarConnect, useGoogleCalendarList, useSelectGoogleCalendar } from "@/hooks/useGoogleCalendar";
import WhatsAppTemplatePicker, { type WhatsAppTemplateSelection } from "@/components/settings/WhatsAppTemplatePicker";
import { useActiveWhatsAppProvider } from "@/hooks/useWhatsAppConnection";
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
  mon: [{ start: "00:00", end: "23:59" }],
  tue: [{ start: "00:00", end: "23:59" }],
  wed: [{ start: "00:00", end: "23:59" }],
  thu: [{ start: "00:00", end: "23:59" }],
  fri: [{ start: "00:00", end: "23:59" }],
  sat: [{ start: "00:00", end: "23:59" }],
  sun: [{ start: "00:00", end: "23:59" }],
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
  const [notifyHost, setNotifyHost] = useState<boolean>(initial?.notify_host ?? true);
  const [locationType, setLocationType] = useState<string>((initial as any)?.location_type || "google_meet");
  const [locationValue, setLocationValue] = useState<string>((initial as any)?.location_value || "");
  const [availability, setAvailability] = useState<Record<string, { start: string; end: string }[]>>(
    (initial?.availability as any) || DEFAULT_AVAILABILITY
  );
  const [notifyGuestWA, setNotifyGuestWA] = useState<boolean>(initial?.notify_guest_whatsapp ?? false);
  const [notifyHostWA, setNotifyHostWA] = useState<boolean>(initial?.notify_host_whatsapp ?? false);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateSelection | null>(
    initial?.whatsapp_confirmation_template_id
      ? {
          id: initial.whatsapp_confirmation_template_id,
          contentVariables: (initial.whatsapp_confirmation_variables as Record<string, string>) || undefined,
        }
      : null,
  );

  const { data: gcalStatus } = useGoogleCalendarStatus(initial?.id);
  const { connect, disconnect } = useGoogleCalendarConnect();
  const { data: calendarList } = useGoogleCalendarList(gcalStatus?.connected ? gcalStatus.tokenId : null);
  const selectCalendar = useSelectGoogleCalendar();
  const { data: activeWaProvider } = useActiveWhatsAppProvider(workspaceId ?? null);

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
      notify_host: notifyHost,
      location_type: locationType,
      location_value: locationType === "google_meet" ? null : (locationValue || null),
    } as any);
  };

  const needsLocationValue = ["zoom", "custom_link", "in_person", "phone_call"].includes(locationType);
  const locationPlaceholder: Record<string, string> = {
    zoom: "https://zoom.us/j/123456789",
    custom_link: "https://meet.example.com/your-room",
    in_person: "123 Main St, Suite 200, City",
    phone_call: "+1 555 000 1234",
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

      {/* Host notification toggle */}
      <div className="rounded-lg border bg-muted/30 p-4 flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            <Label htmlFor="notify-host" className="text-sm font-medium cursor-pointer">
              Email me when someone books
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send a confirmation email to the host with the guest's details for every new booking.
            </p>
          </div>
        </div>
        <Switch id="notify-host" checked={notifyHost} onCheckedChange={setNotifyHost} />
      </div>

      {/* Meeting Location */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Video className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Meeting location</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              How will guests join? The link or address is included in the confirmation email.
            </p>
          </div>
        </div>
        <Select value={locationType} onValueChange={setLocationType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="google_meet">Google Meet (auto-generated)</SelectItem>
            <SelectItem value="zoom">Zoom link</SelectItem>
            <SelectItem value="custom_link">Custom link (Teams, Whereby, etc.)</SelectItem>
            <SelectItem value="in_person">In person</SelectItem>
            <SelectItem value="phone_call">Phone call</SelectItem>
          </SelectContent>
        </Select>
        {locationType === "google_meet" && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            {gcalStatus?.connected
              ? "A Google Meet link is created automatically for every booking."
              : "Connect Google Calendar below so Meet links can be generated."}
          </p>
        )}
        {needsLocationValue && (
          <div>
            <Label className="text-xs">
              {locationType === "in_person" ? "Address" : locationType === "phone_call" ? "Phone number" : "Meeting URL"}
            </Label>
            <Input
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              placeholder={locationPlaceholder[locationType]}
              type={locationType === "zoom" || locationType === "custom_link" ? "url" : "text"}
              required
            />
          </div>
        )}
      </div>


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
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
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
          <div className="mt-2 space-y-1.5">
            <Label className="text-xs">Sync to calendar</Label>
            {calendarList?.calendars && calendarList.calendars.length > 0 ? (
              <Select
                value={calendarList.selected || "primary"}
                onValueChange={(val) => {
                  if (gcalStatus.tokenId) {
                    selectCalendar.mutate({ tokenId: gcalStatus.tokenId, calendarId: val });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendarList.calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      <span className="flex items-center gap-2">
                        {cal.backgroundColor && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cal.backgroundColor }}
                          />
                        )}
                        {cal.summary}{cal.primary ? " (Primary)" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">Loading calendars…</p>
            )}
            <p className="text-xs text-muted-foreground">
              New bookings will create events here and busy times will block availability.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading || !name} className="w-full">
        {loading ? "Saving..." : initial?.id ? "Update Booking Page" : "Create Booking Page"}
      </Button>
    </form>
  );
}
