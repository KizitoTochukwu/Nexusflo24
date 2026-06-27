import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNICompanies } from "@/lib/nexusintel/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["all", "New Research", "Good Fit", "Contacted", "Follow-Up", "Discovery Booked", "Proposal Sent", "Won", "Lost"];

export default function NICompanies() {
  const workspaceId = useWorkspaceId();
  const { data: companies = [], isLoading } = useNICompanies(workspaceId);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = companies.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (q && !`${c.name} ${c.website_url}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Companies</h1>
            <p className="text-muted-foreground">Your CRM of researched companies.</p>
          </div>
          <Button asChild>
            <Link to={`/dashboard/${workspaceId}/nexusintel/analyse`}>Analyse New Company</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input placeholder="Search by name or URL..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No companies match.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Company</th>
                    <th className="p-3">Industry</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last analysed</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          to={`/dashboard/${workspaceId}/nexusintel/companies/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.website_url}</p>
                      </td>
                      <td className="p-3">{c.industry}</td>
                      <td className="p-3">{c.location}</td>
                      <td className="p-3"><Badge variant="outline">{c.lead_score ?? 0}</Badge></td>
                      <td className="p-3"><Badge>{c.status}</Badge></td>
                      <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/dashboard/${workspaceId}/nexusintel/companies/${c.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
