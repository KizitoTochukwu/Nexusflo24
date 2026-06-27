import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNIIntegrations, useUpsertNIIntegration } from "@/lib/nexusintel/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PROVIDERS: { name: string; desc: string }[] = [
  { name: "OpenAI", desc: "Power real AI reasoning for intelligence reports." },
  { name: "Website Data Source", desc: "Fetch live website content for richer analysis." },
  { name: "Google Sheets", desc: "Export reports and CRM data into spreadsheets." },
  { name: "Google Docs", desc: "Create Google Doc versions of reports." },
  { name: "Google Ads", desc: "Pull competitor ad insights for benchmarking." },
  { name: "Meta Ads", desc: "Surface Meta Ad Library signals." },
  { name: "LinkedIn Ads", desc: "LinkedIn Ads insights (advertising data only)." },
  { name: "Gmail", desc: "Send outreach drafts directly from Gmail." },
  { name: "Outlook", desc: "Send outreach drafts directly from Outlook." },
  { name: "NexusFlo24 CRM", desc: "Push companies and reports into your CRM." },
  { name: "Stripe", desc: "Manage NexusIntel subscriptions and billing." },
  { name: "HubSpot", desc: "Sync companies and reports with HubSpot." },
  { name: "Zapier", desc: "Trigger Zaps when reports are generated." },
  { name: "Make", desc: "Trigger Make scenarios when reports are generated." },
];

export default function NIIntegrations() {
  const workspaceId = useWorkspaceId();
  const { data: integrations = [] } = useNIIntegrations(workspaceId);
  const upsert = useUpsertNIIntegration();
  const map = new Map(integrations.map((i) => [i.provider, i.status]));

  const toggle = (provider: string) => {
    const current = map.get(provider) ?? "not_connected";
    const next = current === "connected" ? "not_connected" : "connected";
    upsert.mutate(
      { workspaceId, provider, status: next },
      {
        onSuccess: () =>
          toast.success(`${provider} ${next === "connected" ? "marked as connected" : "disconnected"}.`),
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect providers to enable richer intelligence and outreach. (MVP toggles status; OAuth flows coming soon.)
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => {
            const status = map.get(p.name) ?? "not_connected";
            const connected = status === "connected";
            return (
              <Card key={p.name}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <Badge variant={connected ? "default" : "outline"}>
                      {connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                  <Button size="sm" variant={connected ? "outline" : "default"} onClick={() => toggle(p.name)}>
                    {connected ? "Disconnect" : "Configure"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
