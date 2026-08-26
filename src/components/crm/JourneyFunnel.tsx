import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CrmMetricSnapshot } from "@/hooks/useCrmMetrics";

type Stage = {
  key: string;
  label: string;
  value: number;
  hint: string;
  to?: string;
};

/**
 * One traceable lifecycle, in order, using the canonical metric snapshot only.
 */
const JourneyFunnel = ({
  snapshot,
  base,
}: {
  snapshot: CrmMetricSnapshot;
  base: string;
}) => {
  const stages: Stage[] = [
    { key: "leads", label: "Leads captured", value: snapshot.leads_new, hint: "Acquisition records created in this window", to: `${base}/leads` },
    { key: "contacts", label: "Contacts created", value: snapshot.contacts_new, hint: "Canonical people after deduplication", to: `${base}/crm/contacts` },
    { key: "qualified", label: "Qualified (MQL + SQL)", value: snapshot.contacts_mql + snapshot.contacts_sql, hint: "Lifecycle stage marketing or sales qualified", to: `${base}/crm/contacts` },
    { key: "deals", label: "Open deals", value: snapshot.deals_open, hint: "Deals currently in an open pipeline stage", to: `${base}/crm/deals` },
    { key: "bookings", label: "Bookings", value: snapshot.bookings_total, hint: "Appointments starting in this window", to: `${base}/bookings` },
    { key: "customers", label: "Customers", value: snapshot.contacts_customers, hint: "Contacts at the customer lifecycle stage", to: `${base}/crm/contacts` },
  ];

  const peak = Math.max(...stages.map((s) => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer journey</CardTitle>
        <p className="text-xs text-muted-foreground">
          Acquisition through to revenue, counted once from the shared metric layer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, i) => {
          const prev = i === 0 ? null : stages[i - 1].value;
          const conv = prev && prev > 0 ? (stage.value / prev) * 100 : null;
          return (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  {stage.to ? (
                    <Link to={stage.to} className="text-sm font-medium hover:underline">
                      {stage.label}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{stage.label}</span>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{stage.hint}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold tabular-nums">{stage.value.toLocaleString()}</div>
                  {conv !== null && (
                    <div className="text-xs text-muted-foreground">{conv.toFixed(0)}% of previous</div>
                  )}
                </div>
              </div>
              <Progress value={(stage.value / peak) * 100} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default JourneyFunnel;
