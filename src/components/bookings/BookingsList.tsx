import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Booking, BookingPage } from "@/hooks/useBookings";


interface Props {
  bookings: Booking[];
  bookingPages: BookingPage[];
  onCancel: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function BookingsList({ bookings, bookingPages, onCancel }: Props) {
  const pageMap = Object.fromEntries(bookingPages.map((p) => [p.id, p.name]));

  if (bookings.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guest</TableHead>
          <TableHead>Booking Page</TableHead>
          <TableHead>Date & Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <div className="font-medium">{b.guest_name}</div>
              <div className="text-xs text-muted-foreground">{b.guest_email}</div>
            </TableCell>
            <TableCell className="text-sm">{pageMap[b.booking_page_id] || "—"}</TableCell>
            <TableCell className="text-sm">
              {format(new Date(b.start_time), "MMM d, yyyy")}
              <br />
              <span className="text-muted-foreground">
                {format(new Date(b.start_time), "h:mm a")} – {format(new Date(b.end_time), "h:mm a")}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_COLORS[b.status] || ""}>{b.status}</Badge>
            </TableCell>
            <TableCell>
              {b.status === "confirmed" && (
                <Button variant="ghost" size="icon" onClick={() => onCancel(b.id)} title="Cancel">
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
