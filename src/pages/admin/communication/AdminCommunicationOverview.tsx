import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardCheck, Activity, PackageOpen, Inbox, MessageSquare } from "lucide-react";
import { useAllOrganisations, useSenderProfiles, useCommunicationUsage } from "@/hooks/useAdminCommunication";

export default function AdminCommunicationOverview() {
  const { workspaceId } = useParams();
  const base = `/dashboard/${workspaceId}/admin`;
  const { data: orgs = [] } = useAllOrganisations();
  const { data: pending = [] } = useSenderProfiles(undefined, "pending");
  const { data: usage = [] } = useCommunicationUsage();

  const last24h = usage.filter((u: any) => Date.now() - new Date(u.created_at).getTime() < 86400000);

  const tiles = [
    { href: `${base}/communication/organisations`, icon: Building2, label: "Organisations", value: orgs.length },
    { href: `${base}/sender-approvals`, icon: ClipboardCheck, label: "Pending Approvals", value: pending.length },
    { href: `${base}/usage`, icon: Activity, label: "Sends (24h)", value: last24h.length },
    { href: `${base}/credit-packages`, icon: PackageOpen, label: "Credit Packages", value: "Manage" },
    { href: `${base}/messages`, icon: Inbox, label: "Admin Inbox", value: "Open" },
  ];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiles.map((t) => (
            <Link key={t.href} to={t.href}>
              <Card className="hover:border-accent transition-colors h-full">
                <CardHeader className="pb-2">
                  <t.icon className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{t.value}</div>
                  <div className="text-sm text-muted-foreground">{t.label}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
