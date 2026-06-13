import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Star, ShieldCheck } from "lucide-react";
import {
  useSenderProfiles, useWorkspaceCredits, useAdjustWallet, useCommunicationUsage,
} from "@/hooks/useAdminCommunication";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function statusBadge(s: string) {
  const variant = s === "approved" ? "default" : s === "rejected" || s === "suspended" ? "destructive" : "secondary";
  return <Badge variant={variant as any}>{s}</Badge>;
}

function dnsBadge(s?: string | null) {
  if (!s || s === "pending") return <Badge variant="secondary">pending</Badge>;
  if (s === "verified") return <Badge variant="default">verified</Badge>;
  return <Badge variant="destructive">{s}</Badge>;
}

export default function AdminOrgDetail() {
  const { workspaceId: adminWs, orgId } = useParams();
  const back = `/dashboard/${adminWs}/admin/communication/organisations`;

  const { data: org } = useQuery({
    queryKey: ["org-detail", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("*").eq("id", orgId!).maybeSingle();
      return data;
    },
    enabled: !!orgId,
  });

  const { data: profiles = [] } = useSenderProfiles(orgId);
  const { data: credits } = useWorkspaceCredits(orgId);
  const { data: usage = [] } = useCommunicationUsage(orgId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={back}><ArrowLeft className="h-4 w-4 mr-1" /> Back to organisations</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{org?.name || "Organisation"}</h1>
          <p className="text-sm text-muted-foreground font-mono">{orgId}</p>
        </div>

        <Tabs defaultValue="whatsapp">
          <TabsList>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="credits">Wallet & Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp">
            <ChannelTab workspaceId={orgId!} channel="whatsapp" profiles={profiles.filter((p: any) => p.channel === "whatsapp")} />
          </TabsContent>
          <TabsContent value="sms">
            <ChannelTab workspaceId={orgId!} channel="sms" profiles={profiles.filter((p: any) => p.channel === "sms")} />
          </TabsContent>
          <TabsContent value="email">
            <ChannelTab workspaceId={orgId!} channel="email" profiles={profiles.filter((p: any) => p.channel === "email")} />
          </TabsContent>
          <TabsContent value="credits">
            <CreditsTab workspaceId={orgId!} credits={credits} usage={usage} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("sender-profile-save", { body: payload });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sender-profiles"] });
      toast.success("Sender profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sender_profiles" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sender-profiles"] }); toast.success("Profile deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

function useSetDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; workspace_id: string; channel: string }) => {
      await supabase.from("sender_profiles" as any).update({ is_default: false }).eq("workspace_id", p.workspace_id).eq("channel", p.channel);
      const { error } = await supabase.from("sender_profiles" as any).update({ is_default: true }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sender-profiles"] }); toast.success("Default updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

function useVerifyDns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sender_profile_id: string) => {
      const { data, error } = await supabase.functions.invoke("email-domain-verify", { body: { sender_profile_id } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["sender-profiles"] });
      qc.invalidateQueries({ queryKey: ["sender-details"] });
      toast.success(`DNS: ${d?.verification_status || "checked"}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function ChannelTab({ workspaceId, channel, profiles }: { workspaceId: string; channel: "whatsapp" | "sms" | "email"; profiles: any[] }) {
  const save = useSaveProfile();
  const del = useDeleteProfile();
  const setDefault = useSetDefault();
  const verifyDns = useVerifyDns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ label: "", display_name: "", address: "", is_default: false });
  const [detail, setDetail] = useState<any>({});

  const submit = () =>
    save.mutate(
      { ...form, workspace_id: workspaceId, channel, detail },
      { onSuccess: () => { setOpen(false); setForm({ label: "", display_name: "", address: "" }); setDetail({}); } }
    );

  const detailTable = channel === "whatsapp" ? "whatsapp_senders" : channel === "sms" ? "sms_senders" : "email_senders";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold capitalize">{channel} senders</h3>
        <Button onClick={() => setOpen(!open)} size="sm"><Plus className="h-4 w-4 mr-1" /> Add sender</Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle className="text-base">New {channel} sender</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Sales WhatsApp" /></div>
              <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address ({channel === "email" ? "email" : "phone E.164"})</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            {channel === "whatsapp" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>Business name</Label><Input onChange={(e) => setDetail({ ...detail, business_name: e.target.value })} /></div>
                <div><Label>Twilio WA Sender SID</Label><Input onChange={(e) => setDetail({ ...detail, twilio_wa_sender_sid: e.target.value })} placeholder="MGxxxx or whatsapp:+1..." /></div>
                <div><Label>Meta Business ID</Label><Input onChange={(e) => setDetail({ ...detail, meta_business_id: e.target.value })} /></div>
                <div><Label>Provider</Label>
                  <Select onValueChange={(v) => setDetail({ ...detail, provider: v })} defaultValue="twilio">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="meta">Meta Cloud</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {channel === "sms" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>Sender type</Label>
                  <Select onValueChange={(v) => setDetail({ ...detail, sender_type: v })} defaultValue="dedicated_number">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dedicated_number">Dedicated Number</SelectItem>
                      <SelectItem value="alphanumeric">Alphanumeric ID</SelectItem>
                      <SelectItem value="shared">Shared NexusFlo24</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Country</Label><Input maxLength={2} placeholder="US" onChange={(e) => setDetail({ ...detail, country: e.target.value.toUpperCase() })} /></div>
              </div>
            )}
            {channel === "email" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>From name</Label><Input onChange={(e) => setDetail({ ...detail, from_name: e.target.value })} /></div>
                <div><Label>From email</Label><Input onChange={(e) => setDetail({ ...detail, from_email: e.target.value })} /></div>
                <div><Label>Reply-to</Label><Input onChange={(e) => setDetail({ ...detail, reply_to: e.target.value })} /></div>
                <div><Label>Domain</Label><Input onChange={(e) => setDetail({ ...detail, domain: e.target.value })} placeholder="mail.example.com" /></div>
                <div><Label>DKIM selector</Label><Input onChange={(e) => setDetail({ ...detail, dkim_selector: e.target.value })} placeholder="resend" /></div>
                <div><Label>Provider</Label>
                  <Select onValueChange={(v) => setDetail({ ...detail, provider: v })} defaultValue="resend">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={save.isPending || !form.label}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {profiles.length === 0 ? <p className="p-6 text-sm text-muted-foreground">None yet.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-2">Label</th>
                <th className="text-left p-2">Address</th>
                <th className="text-left p-2">Status</th>
                {channel === "email" && <th className="text-left p-2">DNS</th>}
                <th className="text-right p-2">Actions</th>
              </tr></thead>
              <tbody>
                {profiles.map((p: any) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    channel={channel}
                    detailTable={detailTable}
                    onDelete={() => del.mutate(p.id)}
                    onSetDefault={() => setDefault.mutate({ id: p.id, workspace_id: workspaceId, channel })}
                    onVerifyDns={() => verifyDns.mutate(p.id)}
                    verifying={verifyDns.isPending}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileRow({ profile, channel, detailTable, onDelete, onSetDefault, onVerifyDns, verifying }: any) {
  const { data: detail } = useQuery({
    queryKey: ["sender-details", profile.id, detailTable],
    queryFn: async () => {
      const { data } = await supabase.from(detailTable as any).select("*").eq("sender_profile_id", profile.id).maybeSingle();
      return data as any;
    },
  });

  return (
    <tr className="border-t">
      <td className="p-2 font-medium">
        {profile.label}
        {profile.is_default && <Star className="inline h-3 w-3 ml-1 text-accent fill-accent" />}
        <div className="text-xs text-muted-foreground">{profile.display_name}</div>
      </td>
      <td className="p-2 font-mono text-xs">{profile.address}</td>
      <td className="p-2">{statusBadge(profile.status)}</td>
      {channel === "email" && (
        <td className="p-2 space-x-1">
          {dnsBadge(detail?.spf_status)} {dnsBadge(detail?.dkim_status)} {dnsBadge(detail?.dmarc_status)}
        </td>
      )}
      <td className="p-2 text-right space-x-1">
        {channel === "email" && (
          <Button size="sm" variant="outline" onClick={onVerifyDns} disabled={verifying}>
            <ShieldCheck className="h-3 w-3 mr-1" />Verify DNS
          </Button>
        )}
        {!profile.is_default && profile.status === "approved" && (
          <Button size="sm" variant="ghost" onClick={onSetDefault}>Set default</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </td>
    </tr>
  );
}

function CreditsTab({ workspaceId, credits, usage }: any) {
  const adjust = useAdjustWallet();
  const [channel, setChannel] = useState("email");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");

  const { data: txs = [] } = useQuery({
    queryKey: ["credit-tx", workspaceId],
    queryFn: async () => {
      const { data } = await supabase.from("credit_transactions" as any)
        .select("*").eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }).limit(20);
      return (data as any[]) || [];
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Wallet balance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {["email", "sms", "whatsapp"].map(ch => (
              <div key={ch} className="rounded-lg border p-3">
                <div className="text-xs uppercase text-muted-foreground">{ch}</div>
                <div className="text-2xl font-bold">{(credits as any)?.[`${ch}_balance`] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{(credits as any)?.[`${ch}_used`] ?? 0} used lifetime</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manual adjustment</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-3 items-end">
          <div><Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Amount (negative = deduct)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer support" /></div>
          <Button onClick={() => adjust.mutate({ workspaceId, channel, amount, reason })} disabled={adjust.isPending}>Apply</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent usage</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-2">When</th><th className="text-left p-2">Ch</th>
                <th className="text-left p-2">Country</th><th className="text-right p-2">Cr</th>
              </tr></thead>
              <tbody>
                {usage.slice(0, 20).map((u: any) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="p-2">{u.channel}</td>
                    <td className="p-2">{u.country || "—"}</td>
                    <td className="p-2 text-right">{u.credits_deducted}</td>
                  </tr>
                ))}
                {usage.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No usage yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Wallet transactions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-2">When</th><th className="text-left p-2">Ch</th>
                <th className="text-left p-2">Reason</th><th className="text-right p-2">Amt</th>
              </tr></thead>
              <tbody>
                {txs.map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="p-2">{t.channel}</td>
                    <td className="p-2 text-xs">{t.reason}</td>
                    <td className={`p-2 text-right ${t.amount < 0 ? "text-destructive" : "text-accent"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                  </tr>
                ))}
                {txs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No transactions.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
