import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Search, CalendarIcon, List, LayoutGrid, CalendarDays, CalendarRange, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { BookingPage } from "@/hooks/useBookings";

export type ViewMode = "list" | "calendar" | "week" | "month";
export type Timeframe = "upcoming" | "past" | "all";

interface Props {
  search: string; onSearchChange: (v: string) => void;
  pageId: string; onPageChange: (v: string) => void;
  status: string; onStatusChange: (v: string) => void;
  timeframe: Timeframe; onTimeframeChange: (v: Timeframe) => void;
  dateRange?: DateRange; onDateRangeChange: (r?: DateRange) => void;
  view: ViewMode; onViewChange: (v: ViewMode) => void;
  pages: BookingPage[];
}

export default function AppointmentsToolbar(p: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search guest…" value={p.search} onChange={(e) => p.onSearchChange(e.target.value)} className="pl-8 h-9" />
      </div>

      <Select value={p.pageId} onValueChange={p.onPageChange}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Booking page" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All pages</SelectItem>
          {p.pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={p.status} onValueChange={p.onStatusChange}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="no_show">No-show</SelectItem>
        </SelectContent>
      </Select>

      <Select value={p.timeframe} onValueChange={(v) => p.onTimeframeChange(v as Timeframe)}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="past">Past</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <CalendarIcon className="mr-1 h-3.5 w-3.5" />
            {p.dateRange?.from
              ? p.dateRange.to
                ? `${format(p.dateRange.from, "MMM d")} – ${format(p.dateRange.to, "MMM d")}`
                : format(p.dateRange.from, "MMM d")
              : "Date range"}
            {p.dateRange?.from && (
              <X className="ml-1 h-3 w-3" onClick={(e) => { e.stopPropagation(); p.onDateRangeChange(undefined); }} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={p.dateRange} onSelect={p.onDateRangeChange} numberOfMonths={2} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>

      <div className="ml-auto">
        <ToggleGroup type="single" value={p.view} onValueChange={(v) => v && p.onViewChange(v as ViewMode)} size="sm">
          <ToggleGroupItem value="list" aria-label="List"><List className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="week" aria-label="Week"><CalendarRange className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Month"><CalendarDays className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Agenda"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
