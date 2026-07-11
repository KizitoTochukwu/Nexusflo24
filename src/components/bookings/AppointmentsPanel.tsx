import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppointmentsToolbar, { type ViewMode, type Timeframe } from "./AppointmentsToolbar";
import BookingsList from "./BookingsList";
import AppointmentCalendarView from "./AppointmentCalendarView";
import AppointmentDetailsDrawer from "./AppointmentDetailsDrawer";
import type { Booking, BookingPage } from "@/hooks/useBookings";

interface Props {
  bookings: Booking[];
  pages: BookingPage[];
  workspaceId: string;
  onUpdateStatus: (id: string, status: string) => void;
}

export default function AppointmentsPanel({ bookings, pages, workspaceId, onUpdateStatus }: Props) {
  const [search, setSearch] = useState("");
  const [pageId, setPageId] = useState("all");
  const [status, setStatus] = useState("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (q && !b.guest_name.toLowerCase().includes(q) && !b.guest_email.toLowerCase().includes(q)) return false;
      if (pageId !== "all" && b.booking_page_id !== pageId) return false;
      if (status !== "all" && b.status !== status) return false;
      const start = new Date(b.start_time).getTime();
      if (timeframe === "upcoming" && start < now) return false;
      if (timeframe === "past" && start >= now) return false;
      if (dateRange?.from && start < dateRange.from.getTime()) return false;
      if (dateRange?.to && start > dateRange.to.getTime() + 86400000) return false;
      return true;
    });
  }, [bookings, search, pageId, status, timeframe, dateRange]);

  const openBooking = (b: Booking) => { setSelected(b); setDrawerOpen(true); };

  const sendReminder = async (id: string) => {
    const { error } = await supabase.from("bookings" as any).update({ reminder_sent_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast.error("Failed to log reminder");
    else toast.success("Reminder marked as sent");
  };

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
      <AppointmentsToolbar
        search={search} onSearchChange={setSearch}
        pageId={pageId} onPageChange={setPageId}
        status={status} onStatusChange={setStatus}
        timeframe={timeframe} onTimeframeChange={setTimeframe}
        dateRange={dateRange} onDateRangeChange={setDateRange}
        view={view} onViewChange={setView}
        pages={pages}
      />
      <CardContent className="p-0">
        {view === "list" ? (
          <BookingsList
            bookings={filtered}
            bookingPages={pages}
            workspaceId={workspaceId}
            onSelect={openBooking}
            onUpdateStatus={onUpdateStatus}
            onSendReminder={sendReminder}
          />
        ) : (
          <AppointmentCalendarView bookings={filtered} mode={view} onSelect={openBooking} />
        )}
      </CardContent>

      <AppointmentDetailsDrawer
        booking={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pages={pages}
        workspaceId={workspaceId}
        onUpdateStatus={(id, s) => { onUpdateStatus(id, s); setDrawerOpen(false); }}
        onSendReminder={sendReminder}
      />
    </Card>
  );
}
