import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCommunicationUsage } from "@/hooks/useAdminCommunication";
import { useState, useMemo } from "react";
import { Activity } from "lucide-react";

export default function AdminUsage() {
  const { data: usage = [], isLoading } = useCommunicationUsage();
  const [channel, setChannel] = useState<string>("all");

  const filtered = useMemo(() => channel === "all" ? usage : usage.filter((u: any) => u.channel === channel), [usage, channel]);
  const totalCredits = filtered.reduce((s: number, u: any) => s + (u.credits_deducted || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Global Usage</h1>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total sends</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Credits deducted</div><div className="text-2xl font-bold">{totalCredits}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Failures</div><div className="text-2xl font-bold">{filtered.filter((u:any)=>u.status!=='sent').length}</div></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading…</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">When</th><th className="text-left p-2">Workspace</th>
                  <th className="text-left p-2">Channel</th><th className="text-left p-2">Country</th>
                  <th className="text-right p-2">Credits</th><th className="text-left p-2">Status</th>
                </tr></thead>
                <tbody>
                  {filtered.slice(0,200).map((u:any)=>(
                    <tr key={u.id} className="border-t">
                      <td className="p-2 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="p-2 text-xs font-mono">{u.workspace_id.slice(0,8)}…</td>
                      <td className="p-2"><Badge variant="outline">{u.channel}</Badge></td>
                      <td className="p-2">{u.country || "—"}</td>
                      <td className="p-2 text-right">{u.credits_deducted}</td>
                      <td className="p-2">{u.status}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No usage yet.</td></tr>}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
