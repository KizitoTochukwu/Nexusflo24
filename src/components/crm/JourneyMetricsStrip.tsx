import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Banknote, CalendarCheck2, Handshake, Target, Users } from "lucide-react";
import { useCrmMetrics, formatMinor } from "@/hooks/useCrmMetrics";

/**
 * Shared headline numbers, read from the canonical `crm_metric_snapshot`
 * definitions so every surface shows the same figure.
 */
export default function JourneyMetricsStrip({
  workspaceId,
  days = 30,
  currency = "GBP",
}: {
  workspaceId?: string;
  days?: number;
  currency?: string;
}) {
  const { data, isLoading, isError } = useCrmMetrics(workspaceId, days);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  const cards = [
    { label: "Contacts", value: data.contacts_total, sub: `+${data.contacts_new} in ${days}d`, icon: Users, tint: "bg-primary/10 text-primary" },
    { label: "Sales qualified", value: data.contacts_sql, sub: `${data.contacts_mql} marketing qualified`, icon: Target, tint: "bg-amber-100 text-amber-700" },
    { label: "Open deals", value: data.deals_open, sub: `${formatMinor(Math.round(data.deals_weighted_value * 100), currency)} weighted`, icon: Handshake, tint: "bg-blue-100 text-blue-700" },
    { label: "Bookings", value: data.bookings_total, sub: data.bookings_show_rate == null ? "No show rate yet" : `${data.bookings_show_rate}% show rate`, icon: CalendarCheck2, tint: "bg-violet-100 text-violet-700" },
    { label: "Customers", value: data.contacts_customers, sub: `${data.orders_paid} paid orders`, icon: Users, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Revenue", value: formatMinor(data.revenue_minor, currency), sub: `Last ${days} days`, icon: Banknote, tint: "bg-emerald-100 text-emerald-700" },
  ];

  const gaps = data.leads_unlinked + data.form_unlinked + data.orders_unlinked;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.tint}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-foreground">{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground/80">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {gaps > 0 && (
        <Badge variant="outline" className="gap-1 text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          {gaps} record{gaps === 1 ? "" : "s"} not yet linked to a contact
        </Badge>
      )}
    </div>
  );
}
