import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { BookingPage, Booking } from "@/hooks/useBookings";
import WorkspacePixelLoader from "@/components/analytics/WorkspacePixelLoader";

export default function RescheduleBooking() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [page, setPage] = useState<BookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Fetch booking by token
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/reschedule-booking`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reschedule_token: token }),
          }
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Booking not found");
        } else {
          setBooking(data.booking);
          setPage(data.page);
        }
      } catch {
        setError("Failed to load booking");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, projectId]);

  // Fetch slots when date selected
  useEffect(() => {
    if (!selectedDate || !page) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`https://${projectId}.supabase.co/functions/v1/booking-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_page_id: page.id, date: dateStr }),
    })
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, page, projectId]);

  const handleReschedule = async () => {
    if (!selectedSlot || !token) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/reschedule-booking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reschedule_token: token, new_start_time: selectedSlot }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reschedule failed");
      setBooking(data.booking);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-destructive text-lg font-medium">{error}</p>
            <p className="text-muted-foreground text-sm mt-2">This link may have expired or the booking was cancelled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking || !page) return null;

  if (booking.status === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-destructive text-lg font-medium">This booking has been cancelled</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Rescheduled!</h2>
            <p className="text-muted-foreground mb-1">
              {format(new Date(selectedSlot!), "EEEE, MMMM d, yyyy")} at {format(new Date(selectedSlot!), "h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">{page.duration_minutes} minutes • {page.name}</p>
            <p className="text-sm text-muted-foreground mt-4">A confirmation email has been sent.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxDate = addDays(new Date(), page.max_days_ahead);
  const currentStart = new Date(booking.start_time);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <WorkspacePixelLoader workspaceId={page.workspace_id} />
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-3"
            style={{ backgroundColor: page.color || "#D4AF37" }}
          >
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reschedule Booking</h1>
          <p className="mt-1 text-muted-foreground">{page.name}</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {page.duration_minutes} min</span>
            <span>•</span>
            <span>{page.timezone}</span>
          </div>
        </div>

        {/* Current booking info */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Time</p>
                <p className="text-sm font-medium text-foreground">
                  {format(currentStart, "EEEE, MMMM d, yyyy")} at {format(currentStart, "h:mm a")}
                </p>
              </div>
              {selectedSlot && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New Time</p>
                    <p className="text-sm font-medium text-primary">
                      {format(new Date(selectedSlot), "EEEE, MMMM d, yyyy")} at {format(new Date(selectedSlot), "h:mm a")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Select a New Date</CardTitle></CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > maxDate}
                className={cn("p-3 pointer-events-auto")}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selectedDate && (
              <Card>
                <CardHeader><CardTitle className="text-base">Available Times — {format(selectedDate, "MMM d")}</CardTitle></CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No available slots for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {slots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                          style={selectedSlot === slot ? { backgroundColor: page.color || "#D4AF37" } : {}}
                        >
                          {format(new Date(slot), "h:mm a")}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedSlot && (
              <Button
                onClick={handleReschedule}
                disabled={submitting}
                className="w-full"
                style={{ backgroundColor: page.color || "#D4AF37" }}
              >
                {submitting ? "Rescheduling..." : "Confirm New Time"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
