import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { useAllOrganisations, useSenderProfiles } from "@/hooks/useAdminCommunication";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminMessagesInbox() {
  const { data: orgs = [] } = useAllOrganisations();
  const [orgId, setOrgId] = useState<string>("");
  const { data: profiles = [] } = useSenderProfiles(orgId || undefined);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-inbox", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const [wa, sms, email] = await Promise.all([
        supabase.from("whatsapp_messages").select("id,created_at,direction,from_number,to_number,body").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(50),
        supabase.from("sms_logs").select("id,created_at,direction,from_number,to_number,body").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(50),
        supabase.from("email_logs").select("id,created_at,recipient,subject").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(50),
      ]);
      return [
        ...(wa.data || []).map((m:any)=>({...m,channel:"whatsapp"})),
        ...(sms.data || []).map((m:any)=>({...m,channel:"sms"})),
        ...(email.data || []).map((m:any)=>({...m,channel:"email"})),
      ].sort((a,b)=>+new Date(b.created_at) - +new Date(a.created_at));
    },
    enabled: !!orgId,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" /> Admin Inbox</h1>

        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-medium">Workspace</label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Select workspace…" /></SelectTrigger>
              <SelectContent>{orgs.map((o:any)=><SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {orgId && (
            <div className="text-xs text-muted-foreground">{profiles.filter((p:any)=>p.status==='approved').length} approved sender(s)</div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {!orgId ? <div className="p-8 text-center text-muted-foreground">Pick a workspace to view its inbox.</div> :
             messages.length === 0 ? <div className="p-8 text-center text-muted-foreground">No messages.</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">When</th><th className="text-left p-2">Channel</th>
                  <th className="text-left p-2">Direction</th><th className="text-left p-2">Party</th>
                  <th className="text-left p-2">Body / Subject</th>
                </tr></thead>
                <tbody>
                  {messages.map((m:any) => (
                    <tr key={`${m.channel}-${m.id}`} className="border-t">
                      <td className="p-2 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="p-2"><Badge variant="outline">{m.channel}</Badge></td>
                      <td className="p-2 text-xs">{m.direction || "—"}</td>
                      <td className="p-2 font-mono text-xs">{m.recipient || m.to_number || m.from_number || "—"}</td>
                      <td className="p-2 truncate max-w-md">{m.subject || m.body}</td>
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
