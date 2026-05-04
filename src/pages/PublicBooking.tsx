import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Clock, CheckCircle2, Loader2, Globe2, Video, ArrowLeft, Sparkles, User, Mail, Phone, MessageSquare, Pencil } from "lucide-react";
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
  const [step, setStep] = useState<"pick" | "details" | "review">("pick");

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!page) return null;

  const accent = page.color || "#C9A227";
  const navy = "#0B1F3B";

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(11,31,59,0.25)] ring-1 ring-slate-200/60">
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${navy}, ${accent})` }} />
          <div className="px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight" style={{ color: navy }}>You're all set</h2>
            <p className="text-sm text-slate-500 mb-6">A confirmation has been sent to <span className="font-medium text-slate-700">{guestEmail}</span></p>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Meeting</p>
              <p className="font-semibold" style={{ color: navy }}>{page.name}</p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" style={{ color: accent }} /> {format(new Date(selectedSlot!), "EEEE, MMMM d, yyyy")}</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: accent }} /> {format(new Date(selectedSlot!), "h:mm a")} ({page.duration_minutes} min)</p>
                <p className="flex items-center gap-2"><Globe2 className="h-4 w-4" style={{ color: accent }} /> {page.timezone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxDate = addDays(new Date(), page.max_days_ahead);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10 sm:py-16">
      <WorkspacePixelLoader workspaceId={page.workspace_id} />
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(11,31,59,0.25)] ring-1 ring-slate-200/60">
          <div className="grid md:grid-cols-[340px_1fr]">
            {/* Left rail — premium navy info panel */}
            <aside
              className="relative overflow-hidden p-8 text-white"
              style={{ background: `linear-gradient(165deg, ${navy} 0%, #122a4d 60%, #1a3766 100%)` }}
            >
              {/* decorative orbs */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: accent }} />
              <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-10 blur-3xl bg-white" />

              <div className="relative">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15 backdrop-blur">
                  <Sparkles className="h-3 w-3" style={{ color: accent }} />
                  <span className="text-white/80">Book a meeting</span>
                </div>

                <div
                  className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${accent}, #e0b94a)` }}
                >
                  <CalendarDays className="h-7 w-7 text-white" />
                </div>

                <h1 className="text-2xl font-bold leading-tight tracking-tight">{page.name}</h1>

                {page.description && (
                  <p className="mt-3 text-sm leading-relaxed text-white/70 line-clamp-[10]">{page.description}</p>
                )}

                <div className="mt-7 space-y-3 border-t border-white/10 pt-6">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                      <Clock className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <span className="text-white/85">{page.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                      <Globe2 className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <span className="text-white/85">{page.timezone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                      <Video className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <span className="text-white/85">Web conferencing details upon confirmation</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right pane — calendar + slots / details */}
            <section className="p-6 sm:p-10">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {step === "pick" && (
                <div className="grid gap-8 sm:grid-cols-[1fr_220px]">
                  {/* Calendar */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-base font-semibold tracking-tight" style={{ color: navy }}>Select a date</h2>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date > maxDate}
                        className={cn("p-3 pointer-events-auto")}
                        modifiersStyles={{
                          selected: { backgroundColor: accent, color: "white", fontWeight: 600 },
                          today: { color: accent, fontWeight: 700 },
                        }}
                      />
                    </div>
                  </div>

                  {/* Slots column */}
                  <div className="sm:border-l sm:border-slate-200/70 sm:pl-8">
                    <h2 className="mb-4 text-base font-semibold tracking-tight" style={{ color: navy }}>
                      {selectedDate ? format(selectedDate, "EEE, MMM d") : "Pick a time"}
                    </h2>

                    {!selectedDate ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                        <Clock className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                        <p className="text-xs text-slate-400">Select a date to see available times</p>
                      </div>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                        <p className="text-xs text-slate-500">No available times</p>
                        <p className="mt-1 text-[11px] text-slate-400">Try a different day</p>
                      </div>
                    ) : (
                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <div key={slot} className={cn("flex gap-2 transition-all", isSelected ? "" : "")}>
                              <button
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                                  isSelected
                                    ? "text-white shadow-md"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm"
                                )}
                                style={isSelected ? { backgroundColor: navy, borderColor: navy } : {}}
                              >
                                {format(new Date(slot), "h:mm a")}
                              </button>
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={() => setStep("details")}
                                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
                                  style={{ backgroundColor: accent }}
                                >
                                  Next
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "details" && selectedSlot && (
                <div className="mx-auto max-w-md">
                  <button
                    onClick={() => setStep("pick")}
                    className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>

                  <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Selected time</p>
                    <p className="text-sm font-semibold" style={{ color: navy }}>
                      {format(new Date(selectedSlot), "EEEE, MMMM d")} · {format(new Date(selectedSlot), "h:mm a")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{page.duration_minutes} min · {page.timezone}</p>
                  </div>

                  <h2 className="mb-4 text-base font-semibold tracking-tight" style={{ color: navy }}>Enter your details</h2>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Full name *</Label>
                      <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Jane Doe" required className="h-11 rounded-xl border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Email *</Label>
                      <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" required className="h-11 rounded-xl border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Phone <span className="text-slate-400">(optional)</span></Label>
                      <Input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+1 555 000 0000" className="h-11 rounded-xl border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Anything else? <span className="text-slate-400">(optional)</span></Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Share what you'd like to discuss..." rows={3} className="rounded-xl border-slate-200 resize-none" />
                    </div>

                    <Button
                      onClick={() => setStep("review")}
                      disabled={!guestName || !guestEmail}
                      className="h-12 w-full rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-105"
                      style={{ background: `linear-gradient(135deg, ${navy}, #1a3766)` }}
                    >
                      Review booking
                    </Button>

                    <p className="text-center text-[11px] text-slate-400">
                      By confirming, you agree to receive a calendar invite and reminders.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by <span className="font-semibold" style={{ color: navy }}>NexusFlo24</span>
        </p>
      </div>
    </div>
  );
}
