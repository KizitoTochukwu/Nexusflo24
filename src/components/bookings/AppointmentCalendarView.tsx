import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { Booking } from "@/hooks/useBookings";
import { statusMeta } from "@/lib/bookings/status";

interface Props {
  bookings: Booking[];
  mode: "week" | "month" | "calendar";
  onSelect: (b: Booking) => void;
}

export default function AppointmentCalendarView({ bookings, mode, onSelect }: Props) {
  const today = new Date();

  if (mode === "calendar") {
    // agenda: grouped by day
    const groups = useMemo(() => {
      const map = new Map<string, Booking[]>();
      for (const b of [...bookings].sort((a, z) => new Date(a.start_time).getTime() - new Date(z.start_time).getTime())) {
        const k = format(new Date(b.start_time), "yyyy-MM-dd");
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(b);
      }
      return Array.from(map.entries());
    }, [bookings]);

    if (groups.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No appointments match.</p>;

    return (
      <div className="divide-y">
        {groups.map(([day, items]) => (
          <div key={day} className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {format(new Date(day), "EEEE, MMM d")}
            </div>
            <div className="space-y-2">
              {items.map((b) => {
                const m = statusMeta(b.status);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left hover:shadow-sm transition"
                  >
                    <div className="text-xs font-medium tabular-nums text-muted-foreground w-24 shrink-0">
                      {format(new Date(b.start_time), "h:mm a")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{b.guest_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.guest_email}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${m.classes}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const start = mode === "week" ? startOfWeek(today, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(today), { weekStartsOn: 1 });
  const end = mode === "week" ? endOfWeek(today, { weekStartsOn: 1 }) : endOfWeek(endOfMonth(today), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-px rounded-lg bg-border overflow-hidden text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-muted/50 p-2 text-center font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((day) => {
          const inMonth = mode === "week" || isSameMonth(day, today);
          const items = bookings.filter((b) => isSameDay(new Date(b.start_time), day));
          return (
            <div
              key={day.toISOString()}
              className={`bg-card p-2 ${mode === "week" ? "min-h-[220px]" : "min-h-[110px]"} ${!inMonth ? "opacity-40" : ""}`}
            >
              <div className={`text-[11px] font-semibold mb-1 ${isSameDay(day, today) ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {items.slice(0, mode === "week" ? 8 : 3).map((b) => {
                  const m = statusMeta(b.status);
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelect(b)}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] border ${m.classes}`}
                      title={b.guest_name}
                    >
                      {format(new Date(b.start_time), "HH:mm")} {b.guest_name}
                    </button>
                  );
                })}
                {items.length > (mode === "week" ? 8 : 3) && (
                  <div className="text-[10px] text-muted-foreground">+{items.length - (mode === "week" ? 8 : 3)} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
