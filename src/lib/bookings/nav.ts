import {
  LayoutDashboard, CalendarDays, Layers, Link2, Clock, Users2,
  Plug, Settings2, type LucideIcon,
} from "lucide-react";

export type BookingsNavItem = {
  key: string;
  label: string;
  /** Path suffix appended to /dashboard/:workspaceId/ */
  path: string;
  icon: LucideIcon;
};

/** Primary sections shown as pills on desktop. */
export const BOOKINGS_PRIMARY_NAV: BookingsNavItem[] = [
  { key: "overview", label: "Overview", path: "bookings", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", path: "bookings/calendar", icon: CalendarDays },
  { key: "types", label: "Appointment Types", path: "bookings/types", icon: Layers },
  { key: "pages", label: "Booking Pages", path: "bookings/pages", icon: Link2 },
];

/** Secondary sections tucked into the "More" menu. */
export const BOOKINGS_SECONDARY_NAV: BookingsNavItem[] = [];

export const BOOKINGS_ALL_NAV = [...BOOKINGS_PRIMARY_NAV, ...BOOKINGS_SECONDARY_NAV];

/** Resolve the active section from a pathname. Longest path match wins. */
export function resolveBookingsSection(pathname: string): BookingsNavItem | undefined {
  return [...BOOKINGS_ALL_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname.includes(`/${item.path}`));
}
