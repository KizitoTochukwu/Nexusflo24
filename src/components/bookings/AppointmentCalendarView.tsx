import { useMemo, useState } from "react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Booking } from "@/hooks/useBookings";
import { statusMeta } from "@/lib/bookings/status";

interface Props {
  bookings: Booking[];
  mode: "day" | "week" | "month" | "calendar";
  onSelect: (b: Booking) => void;
}

export default function AppointmentCalendarView({ bookings, mode, onSelect }: Props) {
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));

  const sorted = useMemo(
    () => [...bookings].sort((a, z) => +new Date(a.start_time) - +new Date(z.start_time)),
    [bookings]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of sorted) {
      const k = format(new Date(b.start_time), "yyyy-MM-dd");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const shift = (dir: 1 | -1) => {
    if (mode === "day") setCursor((c) => addDays(c, dir));
    else if (mode === "week") setCursor((c) => (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)));
    else setCursor((c) => (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));
  };

  if (mode === "calendar") {
    if (groups.length === 0) return <Empty />;
    return (
      <div className="divide-y">
        {groups.map(([day, items]) => (
          <div key={day} className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {format(new Date(day), "EEEE, MMM d")}
            </div>
            <div className="space-y-2">
              {items.map((b) => {
                const m = statusMeta(b.status);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition hover:shadow-sm"
                  >
                    <div className="w-24 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {format(new Date(b.start_time), "h:mm a")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.guest_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{b.guest_email}</div>
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

  const header = (
    <div className="flex items-center justify-between gap-2 px-3 pt-3">
      <div className="text-sm font-semibold">
        {mode === "day"
          ? format(cursor, "EEEE, d MMMM yyyy")
          : mode === "week"
            ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy")}`
            : format(cursor, "MMMM yyyy")}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (mode === "day") {
    const items = sorted.filter((b) => isSameDay(new Date(b.start_time), cursor));
    return (
      <div>
        {header}
        <div className="p-3">
          {items.length === 0 ? (
            <Empty label="Nothing scheduled on this day." />
          ) : (
            <div className="space-y-2">
              {items.map((b) => {
                const m = statusMeta(b.status);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:shadow-sm"
                  >
                    <div className="w-32 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {format(new Date(b.start_time), "HH:mm")} – {format(new Date(b.end_time), "HH:mm")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.guest_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{b.guest_email}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${m.classes}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const start = mode === "week"
    ? startOfWeek(cursor, { weekStartsOn: 1 })
    : startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = mode === "week"
    ? endOfWeek(cursor, { weekStartsOn: 1 })
    : endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const maxItems = mode === "week" ? 8 : 3;

  return (
    <div>
      {header}
      <div className="p-3">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border text-xs">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="bg-muted/50 p-2 text-center font-medium text-muted-foreground">{d}</div>
          ))}
          {days.map((day) => {
            const inScope = mode === "week" || isSameMonth(day, cursor);
            const items = sorted.filter((b) => isSameDay(new Date(b.start_time), day));
            return (
              <div
                key={day.toISOString()}
                className={`bg-card p-2 ${mode === "week" ? "min-h-[220px]" : "min-h-[110px]"} ${!inScope ? "opacity-40" : ""}`}
              >
                <div className={`mb-1 text-[11px] font-semibold ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {items.slice(0, maxItems).map((b) => {
                    const m = statusMeta(b.status);
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelect(b)}
                        className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${m.classes}`}
                        title={b.guest_name}
                      >
                        {format(new Date(b.start_time), "HH:mm")} {b.guest_name}
                      </button>
                    );
                  })}
                  {items.length > maxItems && (
                    <div className="text-[10px] text-muted-foreground">+{items.length - maxItems} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Empty({ label = "No appointments match." }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}
