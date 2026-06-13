import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ClipboardCheck, Activity, PackageOpen, Inbox, MessageSquare, ArrowRight } from "lucide-react";
import { useAllOrganisations, useSenderProfiles, useCommunicationUsage } from "@/hooks/useAdminCommunication";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export default function AdminCommunicationOverview() {
  const { workspaceId } = useParams();
  const base = `/dashboard/${workspaceId}/admin`;
  const { data: orgs = [] } = useAllOrganisations();
  const { data: pending = [] } = useSenderProfiles(undefined, "pending");
  const { data: approved = [] } = useSenderProfiles(undefined, "approved");
  const { data: usage = [] } = useCommunicationUsage();

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const last30d = usage.filter((u: any) => Date.now() - new Date(u.created_at).getTime() < 30 * 86400000);
  const totalCredits = last30d.reduce((s: number, u: any) => s + (u.credits_deducted || 0), 0);

  const channelMix = useMemo(() => {
    const m: Record<string, number> = { whatsapp: 0, sms: 0, email: 0 };
    for (const u of last30d) m[u.channel] = (m[u.channel] || 0) + 1;
    return m;
  }, [last30d]);

  const topWorkspaces = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const u of last30d) totals[u.workspace_id] = (totals[u.workspace_id] || 0) + (u.credits_deducted || 0);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [last30d]);

  const { data: lowBalance = [] } = useQuery({
    queryKey: ["low-balance-ws"],
    queryFn: async () => {
      const { data } = await supabase.from("message_credits")
        .select("workspace_id, email_balance, sms_balance, whatsapp_balance")
        .or("email_balance.lt.20,sms_balance.lt.20,whatsapp_balance.lt.20")
        .limit(10);
      return (data as any[]) || [];
    },
  });

  const tiles = [
    { href: `${base}/communication/organisations`, icon: Building2, label: "Organisations", value: orgs.length },
    { href: `${base}/sender-approvals`, icon: ClipboardCheck, label: "Pending Approvals", value: pending.length, alert: pending.length > 0 },
    { href: `${base}/usage`, icon: Activity, label: "Sends (30d)", value: last30d.length },
    { href: "#", icon: MessageSquare, label: "Credits (30d)", value: totalCredits },
    { href: "#", icon: MessageSquare, label: "Approved senders", value: approved.length },
    { href: `${base}/credit-packages`, icon: PackageOpen, label: "Packages", value: "Manage" },
    { href: `${base}/messages`, icon: Inbox, label: "Admin Inbox", value: "Open" },
  ];

  const totalMix = Object.values(channelMix).reduce((a, b) => a + b, 0) || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">Communication Control</h1>
            <p className="text-sm text-muted-foreground">White-label sender management, approvals, and usage across all organisations.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {tiles.map((t) => (
            <Link key={t.label} to={t.href}>
              <Card className={`hover:border-accent transition-colors h-full ${t.alert ? "border-accent" : ""}`}>
                <CardHeader className="pb-1 pt-3 px-3">
                  <t.icon className={`h-4 w-4 ${t.alert ? "text-accent" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  <div className="text-xl font-bold">{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Channel mix (30d)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(channelMix).map(([ch, n]) => (
                <div key={ch}>
                  <div className="flex justify-between text-sm"><span className="capitalize">{ch}</span><span>{n}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(n / totalMix) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top spenders (30d)</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link to={`${base}/communication/organisations`}>All <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {topWorkspaces.map(([id, credits]) => (
                    <tr key={id} className="border-t">
                      <td className="p-2 truncate"><Link className="hover:underline" to={`${base}/communication/organisations/${id}`}>{orgMap[id] || id.slice(0, 8) + "…"}</Link></td>
                      <td className="p-2 text-right font-bold">{credits}</td>
                    </tr>
                  ))}
                  {topWorkspaces.length === 0 && <tr><td className="p-3 text-center text-muted-foreground text-sm">No usage yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Low balance alerts</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {lowBalance.map((c: any) => (
                    <tr key={c.workspace_id} className="border-t">
                      <td className="p-2 truncate"><Link className="hover:underline" to={`${base}/communication/organisations/${c.workspace_id}`}>{orgMap[c.workspace_id] || c.workspace_id.slice(0, 8) + "…"}</Link></td>
                      <td className="p-2 text-right space-x-1">
                        {c.email_balance < 20 && <Badge variant="destructive">E:{c.email_balance}</Badge>}
                        {c.sms_balance < 20 && <Badge variant="destructive">S:{c.sms_balance}</Badge>}
                        {c.whatsapp_balance < 20 && <Badge variant="destructive">W:{c.whatsapp_balance}</Badge>}
                      </td>
                    </tr>
                  ))}
                  {lowBalance.length === 0 && <tr><td className="p-3 text-center text-muted-foreground text-sm">All workspaces healthy.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
