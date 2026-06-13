import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, X, ClipboardCheck } from "lucide-react";
import { useSenderProfiles, useApproveSenderProfile } from "@/hooks/useAdminCommunication";

export default function AdminSenderApprovals() {
  const { data: profiles = [], isLoading } = useSenderProfiles(undefined, "pending");
  const approve = useApproveSenderProfile();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" /> Sender Approvals</h1>
        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading…</div> :
             profiles.length === 0 ? <div className="p-8 text-center text-muted-foreground">No pending approvals.</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-3">Label</th><th className="text-left p-3">Channel</th>
                  <th className="text-left p-3">Address</th><th className="text-left p-3">Workspace</th>
                  <th className="text-left p-3">Rejection reason</th><th className="text-right p-3">Actions</th>
                </tr></thead>
                <tbody>
                  {profiles.map((p: any) => (
                    <tr key={p.id} className="border-t align-top">
                      <td className="p-3 font-medium">{p.label}<div className="text-xs text-muted-foreground">{p.display_name}</div></td>
                      <td className="p-3"><Badge variant="outline">{p.channel}</Badge></td>
                      <td className="p-3 font-mono text-xs">{p.address}</td>
                      <td className="p-3 text-xs font-mono">{p.workspace_id}</td>
                      <td className="p-3">
                        <Input placeholder="optional reason" value={reasons[p.id] || ""} onChange={(e)=>setReasons({...reasons, [p.id]: e.target.value})} className="text-xs" />
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" onClick={()=>approve.mutate({id:p.id,status:"approved"})}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="destructive" onClick={()=>approve.mutate({id:p.id,status:"rejected",reason:reasons[p.id]})}><X className="h-3 w-3" /></Button>
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
