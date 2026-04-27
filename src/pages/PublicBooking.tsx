import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { BookingPage } from "@/hooks/useBookings";
import WorkspacePixelLoader from "@/components/analytics/WorkspacePixelLoader";
import { wsTrack } from "@/lib/analytics/workspacePixels";

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<BookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("booking_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (err || !data) setError("Booking page not found.");
      else setPage(data as unknown as BookingPage);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!selectedDate || !page) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/booking-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_page_id: page.id, date: dateStr }),
    })
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, page]);

  const handleBook = async () => {
    if (!page || !selectedSlot || !guestName || !guestEmail) return;
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/book-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_page_id: page.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone || undefined,
          start_time: selectedSlot,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      wsTrack("Schedule", { content_name: page.name, content_category: "booking" });
      wsTrack("Lead", { content_name: page.name, content_category: "booking" });
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

  if (error && !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!page) return null;

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-1">
              {format(new Date(selectedSlot!), "EEEE, MMMM d, yyyy")} at {format(new Date(selectedSlot!), "h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">{page.duration_minutes} minutes • {page.name}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxDate = addDays(new Date(), page.max_days_ahead);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <WorkspacePixelLoader workspaceId={page.workspace_id} />
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-3" style={{ backgroundColor: page.color || "#D4AF37" }}>
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{page.name}</h1>
          {page.description && <p className="mt-1 text-muted-foreground">{page.description}</p>}
          <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {page.duration_minutes} min</span>
            <span>•</span>
            <span>{page.timezone}</span>
          </div>
        </div>

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader><CardTitle className="text-base">Select a Date</CardTitle></CardHeader>
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

          {/* Slots & Form */}
          <div className="space-y-4">
            {selectedDate && (
              <Card>
                <CardHeader><CardTitle className="text-base">Available Times — {format(selectedDate, "MMM d")}</CardTitle></CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
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
              <Card>
                <CardHeader><CardTitle className="text-base">Your Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Name *</Label>
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" required />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you'd like us to know?" rows={2} />
                  </div>
                  <Button
                    onClick={handleBook}
                    disabled={submitting || !guestName || !guestEmail}
                    className="w-full"
                    style={{ backgroundColor: page.color || "#D4AF37" }}
                  >
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
