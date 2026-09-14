import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Mail, MessageCircle, Smartphone, Star } from "lucide-react";
import { toast } from "sonner";

interface Props { workspaceId: string }

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "sms", label: "SMS", icon: Smartphone },
] as const;

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  draft: "bg-muted text-foreground border-border",
};

export default function SenderProfilesTab({ workspaceId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channel: "email" as "email" | "whatsapp" | "sms",
    label: "",
    display_name: "",
    address: "",
    is_default: false,
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["my-sender-profiles", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sender_profiles" as any)
        .select("id, channel, label, display_name, address, status, is_default, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!workspaceId,
  });

  const handleSubmit = async () => {
    if (!form.label.trim() || !form.address.trim()) {
      toast.error("Label and address are required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("sender-profile-save", {
      body: {
        workspace_id: workspaceId,
        channel: form.channel,
        label: form.label.trim(),
        display_name: form.display_name.trim() || form.label.trim(),
        address: form.address.trim(),
        is_default: form.is_default,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to submit");
      return;
    }
    toast.success("Submitted for review");
    setOpen(false);
    setForm({ channel: "email", label: "", display_name: "", address: "", is_default: false });
    qc.invalidateQueries({ queryKey: ["my-sender-profiles", workspaceId] });
    qc.invalidateQueries({ queryKey: ["getting-started"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Sender Profiles</CardTitle>
          <CardDescription>
            Submit your own Email, WhatsApp, and SMS sender identities. Sends will use these once an admin approves them.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add sender</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit sender for approval</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={form.channel} onValueChange={(v: any) => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Label (internal name)</Label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Marketing Sender" />
              </div>
              <div>
                <Label className="text-xs">Display name</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="What recipients see" />
              </div>
              <div>
                <Label className="text-xs">
                  {form.channel === "email" ? "From email address" : form.channel === "whatsapp" ? "WhatsApp number (E.164)" : "SMS number (E.164)"}
                </Label>
                <Input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder={form.channel === "email" ? "you@yourdomain.com" : "+15551234567"}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
                Set as default for this channel once approved
              </label>
              <p className="text-xs text-muted-foreground">
                After approval an admin will provision the provider credentials. Until then sends fall back to the platform default.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No sender profiles yet. Add one to send from your own brand.
          </p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p: any) => {
              const ch = CHANNELS.find(c => c.value === p.channel);
              const Icon = ch?.icon || Mail;
              return (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{p.label}</span>
                        {p.is_default && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">{p.address}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE[p.status] || STATUS_BADGE.draft}>
                    {p.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
