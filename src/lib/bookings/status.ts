export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export const BOOKING_STATUS_META: Record<string, { label: string; classes: string; dot: string }> = {
  confirmed: {
    label: "Confirmed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  no_show: {
    label: "No-show",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

export function statusMeta(status: string) {
  return (
    BOOKING_STATUS_META[status] ?? {
      label: status,
      classes: "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
    }
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
