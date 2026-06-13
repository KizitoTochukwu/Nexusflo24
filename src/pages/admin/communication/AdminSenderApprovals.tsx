import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useSenderProfiles } from "@/hooks/useAdminCommunication";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSenderApprovals() {
  const { data: pending = [], isLoading } = useSenderProfiles(undefined, "pending");
  const qc = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase.functions.invoke("sender-profile-approve", {
        body: { id, status, reason: reasons[id] || undefined },
      });
      if (error) throw error;
      toast.success(`Sender ${status}`);
      qc.invalidateQueries({ queryKey: ["sender-profiles"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sender Approvals</h1>
          <p className="text-sm text-muted-foreground">Review pending sender profiles across all workspaces.</p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : pending.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No pending approvals.</CardContent></Card>
        ) : (
          pending.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.display_name} · <span className="font-mono">{p.address}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.channel}</Badge>
                  <Badge>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">Workspace: <span className="font-mono">{p.workspace_id}</span></div>
                <Textarea
                  placeholder="Reason (optional, sent to workspace owner)"
                  value={reasons[p.id] || ""}
                  onChange={(e) => setReasons({ ...reasons, [p.id]: e.target.value })}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" disabled={busy === p.id} onClick={() => act(p.id, "rejected")}>Reject</Button>
                  <Button disabled={busy === p.id} onClick={() => act(p.id, "approved")}>Approve</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
