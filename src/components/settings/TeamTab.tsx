import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceMembers, useWorkspaceInvites, useSendInvite, useRevokeInvite, useUpdateMemberRole, useRemoveMember } from "@/hooks/useWorkspaceInvites";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useAssignmentState, useSetRoundRobin, useResetRotation } from "@/hooks/useRoundRobin";
import { useHotLeadPrefs, useUpdateHotLeadPrefs } from "@/hooks/useHotLeadPrefs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Mail, Loader2, Trash2, Shield, Crown, Eye, UserCheck, Repeat, RotateCcw, Flame } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800",
  admin: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-600",
};

const ROLE_ICONS: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
};

export default function TeamTab({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const { canManage } = useWorkspaceRole();
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: invites = [], isLoading: invitesLoading } = useWorkspaceInvites(workspaceId);
  const { data: assignment } = useAssignmentState(workspaceId);
  const { data: hotPrefs } = useHotLeadPrefs(workspaceId);
  const updateHotPrefs = useUpdateHotLeadPrefs();
  const setRR = useSetRoundRobin();
  const resetRot = useResetRotation();
  const sendInvite = useSendInvite();
  const revokeInvite = useRevokeInvite();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  const rrEnabled = assignment?.round_robin_enabled ?? true;
  const lastAssignedMember = (members as any[]).find((m: any) => m.user_id === assignment?.last_assigned_user_id);
  const phoneValue = phoneDraft !== null ? phoneDraft : (hotPrefs?.hot_lead_notify_phone ?? "");

  const handleInvite = async () => {
    if (!email.trim()) { toast.error("Enter an email address."); return; }
    try {
      await sendInvite.mutateAsync({ workspaceId, email: email.trim(), role });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    }
  };

  const pendingInvites = (invites as any[]).filter((i: any) => i.status === "pending");

  return (
    <div className="space-y-6">
      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Team Members</CardTitle></div>
          <CardDescription>People with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {membersLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            (members as any[]).map((m: any) => {
              const RoleIcon = ROLE_ICONS[m.role] || UserCheck;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {m.profile?.avatar_url ? (
                      <img src={m.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                        {(m.profile?.full_name?.[0] || m.profile?.email?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.profile?.full_name || m.profile?.email || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && m.role !== "owner" && m.user_id !== user?.id ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => updateRole.mutate({ memberId: m.id, role: v, workspaceId }, { onSuccess: () => toast.success("Role updated") })}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`${ROLE_COLORS[m.role] || ""} text-xs gap-1`}>
                        <RoleIcon className="h-3 w-3" />{m.role}
                      </Badge>
                    )}
                    {canManage && m.role !== "owner" && m.user_id !== user?.id && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeMember.mutate({ memberId: m.id, workspaceId }, { onSuccess: () => toast.success("Member removed") })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Round-Robin Lead Assignment */}
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Repeat className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Round-Robin Lead Assignment</CardTitle></div>
            <CardDescription>
              When enabled, every new lead is auto-assigned to the next sales rep in rotation. Only the assigned rep gets the new-lead notification (in-app + email).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable round-robin</Label>
                <p className="text-xs text-muted-foreground">Distribute incoming leads across all workspace members.</p>
              </div>
              <Switch
                checked={rrEnabled}
                onCheckedChange={(checked) =>
                  setRR.mutate(
                    { workspaceId, enabled: checked },
                    { onSuccess: () => toast.success(checked ? "Round-robin enabled" : "Round-robin disabled") }
                  )
                }
                disabled={setRR.isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Last assigned</Label>
                <p className="text-xs text-muted-foreground">
                  {lastAssignedMember?.profile?.full_name || lastAssignedMember?.profile?.email || "—"}
                </p>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => resetRot.mutate(workspaceId, { onSuccess: () => toast.success("Rotation reset") })}
                disabled={resetRot.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hot Lead Phone Alerts */}
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Flame className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Hot Lead Phone Alerts</CardTitle></div>
            <CardDescription>
              Get an instant SMS or WhatsApp message when any lead's score crosses 81 and becomes Hot. Sent to the assigned rep's phone (from their profile) or to the override number below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">SMS alert</Label>
                <p className="text-xs text-muted-foreground">Sends via the workspace's SMS provider. Free for admin accounts; otherwise uses 1 SMS credit.</p>
              </div>
              <Switch
                checked={hotPrefs?.hot_lead_sms_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateHotPrefs.mutate(
                    { workspaceId, patch: { hot_lead_sms_enabled: checked } },
                    { onSuccess: () => toast.success(checked ? "SMS Hot Lead alerts on" : "SMS Hot Lead alerts off") }
                  )
                }
                disabled={updateHotPrefs.isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">WhatsApp alert</Label>
                <p className="text-xs text-muted-foreground">Sends via the WhatsApp Cloud API. Off by default — enable if you've messaged your number in the last 24h.</p>
              </div>
              <Switch
                checked={hotPrefs?.hot_lead_whatsapp_enabled ?? false}
                onCheckedChange={(checked) =>
                  updateHotPrefs.mutate(
                    { workspaceId, patch: { hot_lead_whatsapp_enabled: checked } },
                    { onSuccess: () => toast.success(checked ? "WhatsApp Hot Lead alerts on" : "WhatsApp Hot Lead alerts off") }
                  )
                }
                disabled={updateHotPrefs.isPending}
              />
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-sm font-medium">Override phone number (optional)</Label>
              <p className="text-xs text-muted-foreground">If set, alerts go here instead of the assigned rep's profile phone. Use international format, e.g. +447517327597.</p>
              <div className="flex gap-2">
                <Input
                  value={phoneValue}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="+447517327597"
                  className="flex-1"
                  maxLength={20}
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    updateHotPrefs.mutate(
                      { workspaceId, patch: { hot_lead_notify_phone: phoneValue.trim() || null } },
                      { onSuccess: () => { toast.success("Phone updated"); setPhoneDraft(null); } }
                    )
                  }
                  disabled={updateHotPrefs.isPending || phoneDraft === null}
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Invite Team Member</CardTitle></div>
            <CardDescription>Send an invitation to join this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1"
                maxLength={255}
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={sendInvite.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">Role: {inv.role} · Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost" size="sm" className="text-destructive"
                    onClick={() => revokeInvite.mutate({ id: inv.id, workspaceId }, { onSuccess: () => toast.success("Invite revoked") })}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
