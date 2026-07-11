import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarCheck, CalendarClock, CalendarX, TrendingDown, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Booking } from "@/hooks/useBookings";

interface Props { bookings: Booking[] }

export default function BookingsSummaryCards({ bookings }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.start_time) >= now);
    const completed = bookings.filter(
      (b) => b.status === "completed" || (b.status === "confirmed" && new Date(b.end_time) < now),
    );
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const noShows = bookings.filter((b) => b.status === "no_show");
    const denom = completed.length + noShows.length;
    const noShowRate = denom > 0 ? Math.round((noShows.length / denom) * 100) : 0;
    const next = [...upcoming].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )[0];
    return {
      total: bookings.length,
      upcoming: upcoming.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShowRate,
      next,
    };
  }, [bookings]);

  const cards = [
    { label: "Total bookings", value: stats.total, icon: Calendar, tint: "bg-primary/10 text-primary" },
    { label: "Upcoming", value: stats.upcoming, icon: CalendarClock, tint: "bg-amber-100 text-amber-700" },
    { label: "Completed", value: stats.completed, icon: CalendarCheck, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Cancelled", value: stats.cancelled, icon: CalendarX, tint: "bg-rose-100 text-rose-700" },
    { label: "No-show rate", value: `${stats.noShowRate}%`, icon: TrendingDown, tint: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 mb-6">
      {cards.map((c) => (
        <Card key={c.label} className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.tint} mb-3`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="rounded-2xl border-amber-300/50 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-3">
            <Sparkles className="h-4 w-4" />
          </div>
          {stats.next ? (
            <>
              <div className="text-sm font-semibold text-foreground truncate">{stats.next.guest_name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                in {formatDistanceToNow(new Date(stats.next.start_time))}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-foreground">No upcoming</div>
              <div className="text-xs text-muted-foreground mt-1">Next appointment</div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
