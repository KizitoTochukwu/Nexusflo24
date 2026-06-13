import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAllOrganisations } from "@/hooks/useAdminCommunication";
import { useState } from "react";
import { Building2 } from "lucide-react";

export default function AdminOrganisations() {
  const { workspaceId } = useParams();
  const { data: orgs = [], isLoading } = useAllOrganisations();
  const [search, setSearch] = useState("");

  const filtered = orgs.filter((o: any) => o.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Organisations</h1>
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading…</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-3 font-medium">{o.name}</td>
                      <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/dashboard/${workspaceId}/admin/communication/organisations/${o.id}`}>Manage</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
