import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CalendarClock, XCircle, CheckCircle2, UserX, Bell, Eye, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { statusMeta, initials } from "@/lib/bookings/status";
import type { Booking, BookingPage } from "@/hooks/useBookings";

interface Props {
  bookings: Booking[];
  bookingPages: BookingPage[];
  workspaceId: string;
  onSelect: (b: Booking) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onSendReminder: (id: string) => void;
}

export default function BookingsList({ bookings, bookingPages, workspaceId, onSelect, onUpdateStatus, onSendReminder }: Props) {
  const navigate = useNavigate();
  const pageMap = Object.fromEntries(bookingPages.map((p) => [p.id, p.name]));

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No appointments</p>
        <p className="text-xs text-muted-foreground mt-1">Bookings will appear here once guests schedule with you.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guest</TableHead>
          <TableHead>Booking Page</TableHead>
          <TableHead>Date & Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => {
          const m = statusMeta(b.status);
          return (
            <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(b)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {initials(b.guest_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.guest_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.guest_email}</div>
                  </div>
                </div>
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
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${m.classes}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => onSelect(b)}><Eye className="mr-2 h-4 w-4" /> View details</DropdownMenuItem>
                    {b.reschedule_token && (
                      <DropdownMenuItem asChild>
                        <Link to={`/reschedule/${b.reschedule_token}`} target="_blank" rel="noopener noreferrer">
                          <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onSendReminder(b.id)}>
                      <Bell className="mr-2 h-4 w-4" /> Send reminder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onUpdateStatus(b.id, "completed")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark attended
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(b.id, "no_show")}>
                      <UserX className="mr-2 h-4 w-4" /> Mark no-show
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(b.id, "cancelled")} className="text-destructive focus:text-destructive">
                      <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </DropdownMenuItem>
                    {b.lead_id && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/leads?leadId=${b.lead_id}`)}>
                          <User className="mr-2 h-4 w-4" /> Open in CRM
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
