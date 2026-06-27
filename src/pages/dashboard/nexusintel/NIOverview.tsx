import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNICompanies, useNIReports, useNIUsage, useNIIntegrations } from "@/lib/nexusintel/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, FileText, Building2, Target } from "lucide-react";

const PROVIDERS = [
  "OpenAI", "Website Data Source", "Google Sheets", "Google Docs",
  "Google Ads", "Meta Ads", "LinkedIn Ads", "Gmail", "Outlook",
  "NexusFlo24 CRM", "Stripe",
];

export default function NIOverview() {
  const workspaceId = useWorkspaceId();
  const { data: companies = [] } = useNICompanies(workspaceId);
  const { data: reports = [] } = useNIReports(workspaceId);
  const { data: usage } = useNIUsage(workspaceId);
  const { data: integrations = [] } = useNIIntegrations(workspaceId);

  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + (r.crm_deal_score ?? 0), 0) / reports.length)
    : 0;
  const used = usage?.reports_used ?? 0;
  const limit = usage?.monthly_report_limit ?? 5;
  const remaining = Math.max(0, limit - used);

  const intMap = new Map(integrations.map((i) => [i.provider, i.status]));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">NexusIntel</h1>
            <p className="text-muted-foreground">AI Company Intelligence for B2B Sales &amp; Marketing</p>
          </div>
          <Button asChild>
            <Link to={`/dashboard/${workspaceId}/nexusintel/analyse`}>
              <Plus className="h-4 w-4" /> Analyse New Company
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Total reports</p>
                  <p className="text-2xl font-bold">{reports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-xs text-muted-foreground">Used this month</p>
                <p className="text-2xl font-bold">{used}/{limit}</p>
                <p className="text-xs text-muted-foreground">{remaining} remaining</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg deal score</p>
                  <p className="text-2xl font-bold">{avgScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Saved companies</p>
                  <p className="text-2xl font-bold">{companies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent companies analysed</CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No companies yet.</p>
                <Button asChild className="mt-4">
                  <Link to={`/dashboard/${workspaceId}/nexusintel/analyse`}>Analyse your first company</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {companies.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to={`/dashboard/${workspaceId}/nexusintel/companies/${c.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.website_url}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Score {c.lead_score ?? 0}</Badge>
                      <Badge>{c.status}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROVIDERS.map((p) => {
                const status = intMap.get(p) ?? "not_connected";
                const connected = status === "connected";
                return (
                  <div key={p} className="flex items-center justify-between border rounded-lg p-3">
                    <span className="font-medium text-sm">{p}</span>
                    <Badge variant={connected ? "default" : "outline"}>
                      {connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link to={`/dashboard/${workspaceId}/nexusintel/integrations`}>Manage integrations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
