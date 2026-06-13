import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCommunicationUsage, useAllOrganisations } from "@/hooks/useAdminCommunication";
import { useState, useMemo } from "react";
import { Activity, Download } from "lucide-react";

function toCsv(rows: any[]) {
  const cols = ["created_at", "workspace_id", "channel", "country", "credits_deducted", "status", "message_id"];
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  return `${head}\n${body}`;
}

export default function AdminUsage() {
  const { data: usage = [], isLoading } = useCommunicationUsage();
  const { data: orgs = [] } = useAllOrganisations();
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const [channel, setChannel] = useState<string>("all");
  const [orgId, setOrgId] = useState<string>("all");
  const [country, setCountry] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return usage.filter((u: any) => {
      if (channel !== "all" && u.channel !== channel) return false;
      if (orgId !== "all" && u.workspace_id !== orgId) return false;
      if (country && u.country !== country.toUpperCase()) return false;
      if (from && new Date(u.created_at) < new Date(from)) return false;
      if (to && new Date(u.created_at) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [usage, channel, orgId, country, from, to]);

  const totalCredits = filtered.reduce((s: number, u: any) => s + (u.credits_deducted || 0), 0);
  const uniqueWs = new Set(filtered.map((u: any) => u.workspace_id)).size;
  const avg = filtered.length ? (totalCredits / filtered.length).toFixed(2) : "0";

  const downloadCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Global Usage</h1>
          <Button onClick={downloadCsv} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-5 gap-3 items-end">
            <div><Label className="text-xs">Workspace</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All workspaces</SelectItem>
                  {orgs.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Country</Label><Input maxLength={2} placeholder="US" value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total sends</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Credits deducted</div><div className="text-2xl font-bold">{totalCredits}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Avg credits / msg</div><div className="text-2xl font-bold">{avg}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Unique workspaces</div><div className="text-2xl font-bold">{uniqueWs}</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading…</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Workspace</th>
                  <th className="text-left p-2">Channel</th>
                  <th className="text-left p-2">Country</th>
                  <th className="text-right p-2">Credits</th>
                  <th className="text-left p-2">Status</th>
                </tr></thead>
                <tbody>
                  {filtered.slice(0, 500).map((u: any) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="p-2 text-xs">{orgMap[u.workspace_id] || u.workspace_id.slice(0, 8) + "…"}</td>
                      <td className="p-2"><Badge variant="outline">{u.channel}</Badge></td>
                      <td className="p-2">{u.country || "—"}</td>
                      <td className="p-2 text-right">{u.credits_deducted}</td>
                      <td className="p-2">{u.status}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No usage matches the filters.</td></tr>}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
