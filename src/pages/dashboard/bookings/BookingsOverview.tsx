import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useBookings, useBookingPages } from "@/hooks/useBookings";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { useWorkspaceHosts } from "@/hooks/useBookingTeams";
import { useBookingActivity, BOOKING_EVENT_LABELS } from "@/hooks/useBookingEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isToday } from "date-fns";
import {
  CalendarClock, CalendarCheck2, CalendarX2, UserX, TrendingUp, Plus,
  Layers, Activity, Clock,
} from "lucide-react";
import { statusMeta } from "@/lib/bookings/status";
import { useCrmMetrics } from "@/hooks/useCrmMetrics";

export default function BookingsOverview() {
  const workspaceId = useWorkspaceId();
  const { data: bookings = [], isLoading } = useBookings(workspaceId);
  const { data: pages = [] } = useBookingPages(workspaceId);
  const { data: types = [] } = useAppointmentTypes(workspaceId);
  const { data: hosts = [] } = useWorkspaceHosts(workspaceId);
  const { data: activity = [] } = useBookingActivity(workspaceId);
  // Canonical definitions (show rate = completed / (completed + no-show)).
  const { data: metrics } = useCrmMetrics(workspaceId, 365);

  const to = (p: string) => `/dashboard/${workspaceId}/${p}`;

  const stats = useMemo(() => {
    const now = new Date();
    const today = bookings.filter((b) => isToday(new Date(b.start_time)) && b.status !== "cancelled");
    const upcoming = bookings.filter((b) => isAfter(new Date(b.start_time), now) && b.status === "confirmed");
    const pending = bookings.filter((b) => b.status === "pending");
    const completed = bookings.filter((b) => b.status === "completed");
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const noShow = bookings.filter((b) => b.status === "no_show");
    const finished = completed.length + noShow.length;
    return {
      today: today.length,
      upcoming: upcoming.length,
      pending: pending.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      total: bookings.length,
      showRate: metrics?.bookings_show_rate ?? (finished ? Math.round((completed.length / finished) * 100) : null),
    };
  }, [bookings, metrics]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const t = types.find((x) => x.id === b.appointment_type_id);
      const key = t?.name ?? pages.find((p) => p.id === b.booking_page_id)?.name ?? "Unassigned";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [bookings, types, pages]);

  const byHost = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const h = hosts.find((x) => x.user_id === b.host_user_id);
      map.set(h?.name ?? "Unassigned", (map.get(h?.name ?? "Unassigned") ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [bookings, hosts]);

  const nextUp = useMemo(
    () => bookings
      .filter((b) => isAfter(new Date(b.start_time), new Date()) && b.status !== "cancelled")
      .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))
      .slice(0, 5),
    [bookings]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bookings Overview</h1>
          <p className="text-sm text-muted-foreground">Everything scheduled across your workspace, at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={to("bookings/types")}><Layers className="mr-2 h-4 w-4" /> Appointment types</Link></Button>
          <Button asChild><Link to={to("bookings/pages")}><Plus className="mr-2 h-4 w-4" /> New booking page</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CalendarClock} label="Today" value={stats.today} tone="primary" />
        <Stat icon={CalendarCheck2} label="Upcoming" value={stats.upcoming} tone="emerald" />
        <Stat icon={Clock} label="Awaiting confirmation" value={stats.pending} tone="amber" />
        <Stat icon={TrendingUp} label="Show rate" value={stats.showRate === null ? "—" : `${stats.showRate}%`} tone="accent" />
        <Stat icon={CalendarCheck2} label="Completed" value={stats.completed} tone="blue" />
        <Stat icon={CalendarX2} label="Cancelled" value={stats.cancelled} tone="rose" />
        <Stat icon={UserX} label="No-shows" value={stats.noShow} tone="amber" />
        <Stat icon={Activity} label="Total booked" value={stats.total} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Next up</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {nextUp.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled yet.</p>
            ) : nextUp.map((b) => {
              const m = statusMeta(b.status);
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className="w-28 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {format(new Date(b.start_time), "EEE d MMM, HH:mm")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.guest_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.guest_email}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${m.classes}`}>{m.label}</span>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link to={to("bookings/calendar")}>Open calendar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No booking activity recorded yet.</p>
            ) : activity.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-xs">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{BOOKING_EVENT_LABELS[e.event_type] ?? e.event_type}</p>
                  <p className="text-muted-foreground">
                    {String((e.payload as any)?.guest_name ?? "")} · {format(new Date(e.created_at), "d MMM HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="By appointment type" rows={byType} total={stats.total} />
        <Breakdown title="By host" rows={byHost} total={stats.total} />
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  accent: "bg-accent/15 text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
};

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : rows.map(([label, count]) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{label}</span>
              <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
