import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Mail, Phone, Copy, ExternalLink, CalendarClock, XCircle, CheckCircle2, UserX, Bell, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { statusMeta, initials } from "@/lib/bookings/status";
import type { Booking, BookingPage } from "@/hooks/useBookings";

interface Props {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pages: BookingPage[];
  workspaceId: string;
  onUpdateStatus: (id: string, status: string) => void;
  onSendReminder: (id: string) => void;
}

export default function AppointmentDetailsDrawer({
  booking, open, onOpenChange, pages, workspaceId, onUpdateStatus, onSendReminder,
}: Props) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(((booking as any)?.internal_notes as string) ?? "");
  }, [booking?.id]);

  if (!booking) return null;
  const page = pages.find((p) => p.id === booking.booking_page_id);
  const m = statusMeta(booking.status);

  let formAnswers: Record<string, unknown> | null = null;
  if (booking.notes) {
    try { const p = JSON.parse(booking.notes); if (p && typeof p === "object") formAnswers = p; } catch { /* text */ }
  }

  const copy = (v: string, label: string) => { navigator.clipboard.writeText(v); toast.success(`${label} copied`); };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from("bookings" as any).update({ internal_notes: notes } as any).eq("id", booking.id);
    setSaving(false);
    if (error) toast.error("Failed to save notes"); else toast.success("Notes saved");
  };

  const reminderSentAt = (booking as any).reminder_sent_at as string | null | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {initials(booking.guest_name)}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate text-left">{booking.guest_name}</SheetTitle>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] mt-1 ${m.classes}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
              </span>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${booking.guest_email}`} className="hover:underline truncate">{booking.guest_email}</a>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => copy(booking.guest_email, "Email")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {booking.guest_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${booking.guest_phone}`} className="hover:underline">{booking.guest_phone}</a>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => copy(booking.guest_phone!, "Phone")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-1.5 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Appointment</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Booking page</span><span className="font-medium">{page?.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{format(new Date(booking.start_time), "EEE, MMM d, yyyy")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{format(new Date(booking.start_time), "h:mm a")} – {format(new Date(booking.end_time), "h:mm a")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span className="font-medium">{page?.timezone ?? "UTC"}</span></div>
            {booking.reschedule_token && (
              <Button variant="outline" size="sm" asChild className="w-full mt-2">
                <Link to={`/reschedule/${booking.reschedule_token}`} target="_blank" rel="noopener noreferrer">
                  <CalendarClock className="mr-2 h-3.5 w-3.5" /> Open reschedule link
                </Link>
              </Button>
            )}
          </section>

          {formAnswers && (
            <>
              <Separator />
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Form answers</div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  {Object.entries(formAnswers).map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div className="font-medium">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CRM</div>
            {booking.lead_id ? (
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to={`/dashboard/${workspaceId}/leads?leadId=${booking.lead_id}`}>
                  <User className="mr-2 h-3.5 w-3.5" /> Open contact in CRM
                  <ExternalLink className="ml-auto h-3 w-3" />
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">No linked CRM contact.</p>
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminder</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {reminderSentAt ? `Sent ${format(new Date(reminderSentAt), "MMM d, h:mm a")}` : "No reminder sent"}
              </span>
              <Button variant="outline" size="sm" onClick={() => onSendReminder(booking.id)}>
                <Bell className="mr-1.5 h-3.5 w-3.5" /> Send now
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Only visible to your team…" />
            <Button size="sm" onClick={saveNotes} disabled={saving}>{saving ? "Saving…" : "Save notes"}</Button>
          </section>

          <Separator />

          <section className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(booking.id, "completed")}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Attended
            </Button>
            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(booking.id, "no_show")}>
              <UserX className="mr-1.5 h-3.5 w-3.5" /> No-show
            </Button>
            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(booking.id, "cancelled")} className="text-destructive hover:text-destructive col-span-2">
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel appointment
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
