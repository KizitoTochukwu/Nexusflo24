import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCrmMetrics, formatMinor } from "@/hooks/useCrmMetrics";
import JourneyFunnel from "@/components/crm/JourneyFunnel";
import DuplicateReviewPanel from "@/components/crm/DuplicateReviewPanel";

type Finding = { id: string; label: string; detail: string; to?: string; severity: "high" | "medium" };

const DashboardCustomerJourney = () => {
  const workspaceId = useWorkspaceId();
  const base = `/dashboard/${workspaceId}`;
  const [days, setDays] = useState(90);
  const { data, isLoading, isError, error, refetch, isFetching } = useCrmMetrics(workspaceId, days);

  const findings = useMemo<Finding[]>(() => {
    if (!data) return [];
    const out: Finding[] = [];
    if (data.leads_unlinked > 0)
      out.push({
        id: "leads",
        severity: "high",
        label: `${data.leads_unlinked} leads not linked to a contact`,
        detail: "These leads cannot be enrolled, scored or reported against the canonical contact record.",
        to: `${base}/leads`,
      });
    if (data.form_unlinked > 0)
      out.push({
        id: "forms",
        severity: "high",
        label: `${data.form_unlinked} form submissions without a contact`,
        detail: "Submissions arrived without an email or phone that could be resolved to a person.",
        to: `${base}/forms`,
      });
    if (data.orders_unlinked > 0)
      out.push({
        id: "orders",
        severity: "high",
        label: `${data.orders_unlinked} paid orders without a CRM contact`,
        detail: "Revenue is not attributed to a person, so follow-up and access fulfilment can be missed.",
        to: `${base}/commerce`,
      });
    if (data.tasks_overdue > 0)
      out.push({
        id: "tasks",
        severity: "medium",
        label: `${data.tasks_overdue} overdue tasks`,
        detail: "Follow-up commitments are past their due date.",
        to: `${base}/crm/tasks`,
      });
    if (data.enrolments_failed > 0)
      out.push({
        id: "enrolments",
        severity: "medium",
        label: `${data.enrolments_failed} failed automation enrolments`,
        detail: "Contacts entered a workflow but the run did not complete.",
        to: `${base}/automations`,
      });
    if (data.contacts_new > 0 && data.deals_open === 0)
      out.push({
        id: "deals",
        severity: "medium",
        label: "No open deals despite new contacts",
        detail: "Qualified contacts are not being converted into pipeline opportunities.",
        to: `${base}/crm/deals`,
      });
    if (data.bookings_no_show > 0 && (data.bookings_show_rate ?? 100) < 70)
      out.push({
        id: "show",
        severity: "medium",
        label: `Show rate is ${(data.bookings_show_rate ?? 0).toFixed(0)}%`,
        detail: "Add reminder automation before appointments to reduce no-shows.",
        to: `${base}/bookings`,
      });
    return out;
  }, [data, base]);

  return (
    <div className="space-y-6">
      <Seo
        title="Customer Journey | NexusFlo24"
        description="Track every prospect from acquisition through qualification, pipeline, booking and revenue in one traceable CRM lifecycle."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Journey</h1>
          <p className="text-sm text-muted-foreground">
            One lifecycle from acquisition to revenue, plus the data gaps that break it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {(error as any)?.message || "Could not load journey metrics."}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Contacts", value: data.contacts_total.toLocaleString() },
              { label: "Open pipeline", value: formatMinor(data.deals_open_value) },
              { label: "Paid orders", value: data.orders_paid.toLocaleString() },
              { label: "Revenue", value: formatMinor(data.revenue_minor) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <JourneyFunnel snapshot={data} base={base} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Journey health</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Gaps that stop a prospect being traceable end to end. Nothing is changed automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {findings.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    No journey gaps detected in this window.
                  </div>
                ) : (
                  findings.map((f) => (
                    <div key={f.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={f.severity === "high" ? "destructive" : "secondary"}>
                          {f.severity === "high" ? "High" : "Medium"}
                        </Badge>
                        <span className="text-sm font-medium">{f.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                      {f.to && (
                        <Link to={f.to} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                          Review
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <DuplicateReviewPanel workspaceId={workspaceId} base={base} />
        </>
      ) : null}
    </div>
  );
};

export default DashboardCustomerJourney;
