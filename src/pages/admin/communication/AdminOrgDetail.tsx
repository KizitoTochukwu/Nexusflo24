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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  useSenderProfiles, useUpsertSenderProfile, useWorkspaceCredits, useAdjustWallet, useCommunicationUsage,
} from "@/hooks/useAdminCommunication";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function statusBadge(s: string) {
  const variant = s === "approved" ? "default" : s === "rejected" || s === "suspended" ? "destructive" : "secondary";
  return <Badge variant={variant as any}>{s}</Badge>;
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

        <Tabs defaultValue="profiles">
          <TabsList>
            <TabsTrigger value="profiles">Sender Profiles</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="credits">Usage & Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            <ProfilesTab workspaceId={orgId!} profiles={profiles} />
          </TabsContent>
          <TabsContent value="whatsapp">
            <ChannelTab workspaceId={orgId!} channel="whatsapp" profiles={profiles.filter((p:any)=>p.channel==='whatsapp')} />
          </TabsContent>
          <TabsContent value="sms">
            <ChannelTab workspaceId={orgId!} channel="sms" profiles={profiles.filter((p:any)=>p.channel==='sms')} />
          </TabsContent>
          <TabsContent value="email">
            <ChannelTab workspaceId={orgId!} channel="email" profiles={profiles.filter((p:any)=>p.channel==='email')} />
          </TabsContent>
          <TabsContent value="credits">
            <CreditsTab workspaceId={orgId!} credits={credits} usage={usage} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ProfilesTab({ workspaceId, profiles }: any) {
  return (
    <Card>
      <CardHeader><CardTitle>All Sender Profiles</CardTitle></CardHeader>
      <CardContent>
        {profiles.length === 0 ? <p className="text-sm text-muted-foreground">No sender profiles yet. Use the channel tabs to add one.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Label</th><th className="text-left p-2">Channel</th>
                <th className="text-left p-2">Address</th><th className="text-left p-2">Status</th>
                <th className="text-left p-2">Default</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p:any) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.label}</td>
                  <td className="p-2 uppercase text-xs">{p.channel}</td>
                  <td className="p-2 font-mono text-xs">{p.address}</td>
                  <td className="p-2">{statusBadge(p.status)}</td>
                  <td className="p-2">{p.is_default ? "★" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ChannelTab({ workspaceId, channel, profiles }: { workspaceId: string; channel: "whatsapp"|"sms"|"email"; profiles: any[] }) {
  const upsert = useUpsertSenderProfile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ label: "", display_name: "", address: "", is_default: false });
  const [detail, setDetail] = useState<any>({});

  const save = () => {
    upsert.mutate(
      { ...form, workspace_id: workspaceId, channel, status: "pending", detail },
      { onSuccess: () => { setOpen(false); setForm({ label: "", display_name: "", address: "" }); setDetail({}); } }
    );
  };

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
              <div><Label>Label</Label><Input value={form.label} onChange={(e)=>setForm({...form,label:e.target.value})} placeholder="e.g. Sales WhatsApp" /></div>
              <div><Label>Display name</Label><Input value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})} /></div>
              <div className="col-span-2"><Label>Address ({channel === "email" ? "email" : "phone E.164"})</Label><Input value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} /></div>
            </div>
            {channel === "whatsapp" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>Business name</Label><Input onChange={(e)=>setDetail({...detail,business_name:e.target.value})} /></div>
                <div><Label>Website</Label><Input onChange={(e)=>setDetail({...detail,website:e.target.value})} /></div>
                <div><Label>Category</Label><Input onChange={(e)=>setDetail({...detail,category:e.target.value})} /></div>
                <div><Label>Address</Label><Input onChange={(e)=>setDetail({...detail,address:e.target.value})} /></div>
                <div><Label>Meta Business ID</Label><Input onChange={(e)=>setDetail({...detail,meta_business_id:e.target.value})} /></div>
                <div><Label>Twilio WA Sender SID</Label><Input onChange={(e)=>setDetail({...detail,twilio_wa_sender_sid:e.target.value})} /></div>
                <div><Label>Provider</Label>
                  <Select onValueChange={(v)=>setDetail({...detail,provider:v})} defaultValue="twilio">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="meta">Meta Cloud</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {channel === "sms" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>Sender type</Label>
                  <Select onValueChange={(v)=>setDetail({...detail,sender_type:v})} defaultValue="dedicated_number">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dedicated_number">Dedicated Number</SelectItem>
                      <SelectItem value="alphanumeric">Alphanumeric ID</SelectItem>
                      <SelectItem value="shared">Shared NexusFlo24</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Country</Label><Input maxLength={2} placeholder="US" onChange={(e)=>setDetail({...detail,country:e.target.value.toUpperCase()})} /></div>
                <div><Label>Monthly fee (cents)</Label><Input type="number" onChange={(e)=>setDetail({...detail,monthly_fee_cents:Number(e.target.value)})} /></div>
              </div>
            )}
            {channel === "email" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>From name</Label><Input onChange={(e)=>setDetail({...detail,from_name:e.target.value})} /></div>
                <div><Label>Reply-to</Label><Input onChange={(e)=>setDetail({...detail,reply_to:e.target.value})} /></div>
                <div><Label>Domain</Label><Input onChange={(e)=>setDetail({...detail,domain:e.target.value})} /></div>
                <div><Label>Provider</Label>
                  <Select onValueChange={(v)=>setDetail({...detail,provider:v})} defaultValue="resend">
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
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={upsert.isPending || !form.label}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {profiles.length === 0 ? <p className="p-6 text-sm text-muted-foreground">None yet.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-2">Label</th><th className="text-left p-2">Address</th><th className="text-left p-2">Status</th>
              </tr></thead>
              <tbody>
                {profiles.map((p:any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-medium">{p.label}<div className="text-xs text-muted-foreground">{p.display_name}</div></td>
                    <td className="p-2 font-mono text-xs">{p.address}</td>
                    <td className="p-2">{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreditsTab({ workspaceId, credits, usage }: any) {
  const adjust = useAdjustWallet();
  const [channel, setChannel] = useState("email");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Wallet balance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {["email","sms","whatsapp"].map(ch => (
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
          <div><Label>Amount (negative = deduct)</Label><Input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} /></div>
          <div className="col-span-1"><Label>Reason</Label><Input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Customer support" /></div>
          <Button onClick={()=>adjust.mutate({workspaceId, channel, amount, reason})} disabled={adjust.isPending}>Apply</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent usage</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-2">When</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Country</th>
              <th className="text-right p-2">Credits</th><th className="text-left p-2">Status</th>
            </tr></thead>
            <tbody>
              {usage.slice(0,20).map((u:any) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="p-2">{u.channel}</td><td className="p-2">{u.country || "—"}</td>
                  <td className="p-2 text-right">{u.credits_deducted}</td><td className="p-2">{u.status}</td>
                </tr>
              ))}
              {usage.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No usage yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
