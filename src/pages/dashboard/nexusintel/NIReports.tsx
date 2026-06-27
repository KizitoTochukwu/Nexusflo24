import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNIReports } from "@/lib/nexusintel/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NIReports() {
  const workspaceId = useWorkspaceId();
  const { data: reports = [], isLoading } = useNIReports(workspaceId);
  const [q, setQ] = useState("");

  const filtered = reports.filter((r) =>
    !q || (r.report_title ?? "").toLowerCase().includes(q.toLowerCase()) || (r.user_offer ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports Library</h1>
            <p className="text-muted-foreground">All AI-generated company intelligence reports.</p>
          </div>
          <Button asChild>
            <Link to={`/dashboard/${workspaceId}/nexusintel/analyse`}>New Analysis</Link>
          </Button>
        </div>

        <Input placeholder="Search reports..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No reports yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/dashboard/${workspaceId}/nexusintel/reports/${r.id}`}
                      className="font-semibold hover:underline"
                    >
                      {r.report_title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · Offer: {r.user_offer}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Score {r.crm_deal_score ?? 0}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/${workspaceId}/nexusintel/reports/${r.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
