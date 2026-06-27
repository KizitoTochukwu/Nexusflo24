import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNIUsage, useNIReports } from "@/lib/nexusintel/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NIUsage() {
  const workspaceId = useWorkspaceId();
  const { data: usage } = useNIUsage(workspaceId);
  const { data: reports = [] } = useNIReports(workspaceId);
  const used = usage?.reports_used ?? 0;
  const limit = usage?.monthly_report_limit ?? 5;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Usage &amp; Billing</h1>
          <p className="text-muted-foreground">Your monthly NexusIntel report usage.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="text-base px-3 py-1">{usage?.plan ?? "Starter"}</Badge>
              <Button asChild>
                <Link to={`/pricing`}>Upgrade plan</Link>
              </Button>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Reports used</span>
                <span className="font-semibold">{used} / {limit}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Resets at the start of each calendar month.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity yet.</p>
            ) : (
              <div className="divide-y">
                {reports.slice(0, 10).map((r) => (
                  <div key={r.id} className="py-2 flex justify-between text-sm">
                    <span>Generated report: {r.report_title}</span>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
