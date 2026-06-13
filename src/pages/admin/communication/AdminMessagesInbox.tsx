import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Inbox, Radio } from "lucide-react";
import { useAllOrganisations, useSenderProfiles } from "@/hooks/useAdminCommunication";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function MessagesTable({ rows, channel, onPick }: any) {
  if (!rows.length) return <div className="p-8 text-center text-muted-foreground">No messages.</div>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr>
        <th className="text-left p-2">When</th>
        <th className="text-left p-2">Direction</th>
        <th className="text-left p-2">{channel === "email" ? "Recipient" : "Phone"}</th>
        <th className="text-left p-2">{channel === "email" ? "Subject" : "Body"}</th>
        <th className="text-left p-2">Status</th>
      </tr></thead>
      <tbody>
        {rows.map((m: any) => (
          <tr key={m.id} className="border-t hover:bg-muted/40 cursor-pointer" onClick={() => onPick(m)}>
            <td className="p-2 text-xs">{new Date(m.created_at).toLocaleString()}</td>
            <td className="p-2 text-xs">{m.direction || "outbound"}</td>
            <td className="p-2 font-mono text-xs">{m.recipient || m.phone_number || m.to_number || m.from_number || "—"}</td>
            <td className="p-2 truncate max-w-md">{m.subject || m.body}</td>
            <td className="p-2"><Badge variant="outline">{m.status || "—"}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminMessagesInbox() {
  const { data: orgs = [] } = useAllOrganisations();
  const [orgId, setOrgId] = useState<string>("");
  const { data: profiles = [] } = useSenderProfiles(orgId || undefined);
  const [picked, setPicked] = useState<any>(null);

  const { data: wa = [] } = useQuery({
    queryKey: ["admin-inbox-wa", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("whatsapp_messages").select("*").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: sms = [] } = useQuery({
    queryKey: ["admin-inbox-sms", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("sms_logs").select("*").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: email = [] } = useQuery({
    queryKey: ["admin-inbox-email", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("email_logs").select("*").eq("workspace_id", orgId).order("created_at", { ascending: false }).limit(200);
      return data || [];
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
              <SelectContent>{orgs.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {orgId && (
            <div className="text-xs text-muted-foreground">{profiles.filter((p: any) => p.status === "approved").length} approved sender(s)</div>
          )}
        </div>

        {!orgId ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Pick a workspace to view its inbox.</CardContent></Card>
        ) : (
          <Tabs defaultValue="whatsapp">
            <TabsList>
              <TabsTrigger value="whatsapp">WhatsApp ({wa.length})</TabsTrigger>
              <TabsTrigger value="sms">SMS ({sms.length})</TabsTrigger>
              <TabsTrigger value="email">Email ({email.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp"><Card><CardContent className="p-0"><MessagesTable rows={wa} channel="whatsapp" onPick={(m: any) => setPicked({ ...m, _channel: "whatsapp" })} /></CardContent></Card></TabsContent>
            <TabsContent value="sms"><Card><CardContent className="p-0"><MessagesTable rows={sms} channel="sms" onPick={(m: any) => setPicked({ ...m, _channel: "sms" })} /></CardContent></Card></TabsContent>
            <TabsContent value="email"><Card><CardContent className="p-0"><MessagesTable rows={email} channel="email" onPick={(m: any) => setPicked({ ...m, _channel: "email" })} /></CardContent></Card></TabsContent>
          </Tabs>
        )}

        <Sheet open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
          <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
            <SheetHeader><SheetTitle>Message details</SheetTitle></SheetHeader>
            {picked && (
              <div className="mt-4 space-y-3 text-sm">
                <div><span className="text-muted-foreground">Channel:</span> {picked._channel}</div>
                <div><span className="text-muted-foreground">When:</span> {new Date(picked.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{picked.status}</Badge></div>
                {picked.error && <div className="text-destructive">{picked.error}</div>}
                <div className="rounded border p-3 bg-muted/40 whitespace-pre-wrap text-xs">{picked.body || picked.subject || JSON.stringify(picked, null, 2)}</div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Raw payload</summary>
                  <pre className="text-xs mt-2 overflow-x-auto">{JSON.stringify(picked, null, 2)}</pre>
                </details>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
