import { useMemo, useState } from "react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useBookings, useBookingPages, useUpdateBooking } from "@/hooks/useBookings";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentsPanel from "@/components/bookings/AppointmentsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function BookingsCalendar() {
  const workspaceId = useWorkspaceId();
  const { data: bookings = [], isLoading } = useBookings(workspaceId);
  const { data: pages = [] } = useBookingPages(workspaceId);
  const updateBooking = useUpdateBooking();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground">Day, week, month and agenda views of everything booked.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[520px] rounded-2xl" />
      ) : bookings.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 font-medium">No appointments yet</p>
            <p className="text-sm text-muted-foreground">Bookings made through your public pages show up here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <AppointmentsPanel
          bookings={bookings}
          pages={pages}
          workspaceId={workspaceId}
          defaultView="week"
          onUpdateStatus={(id, status) => updateBooking.mutate({ id, status })}
        />
      )}
    </div>
  );
}
