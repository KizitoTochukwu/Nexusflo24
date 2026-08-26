import { Link } from "react-router-dom";
import { PageHeader, NotConfigured } from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Existing workspace-scoped admin screens still hold these tools until they are migrated. */
function ExistingTools({ links }: { links: { label: string; path: string }[] }) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  if (!wsId) return null;
  return (
    <Card className="mt-4">
      <CardContent className="pt-5">
        <p className="mb-2 text-sm font-medium">Available today</p>
        <ul className="space-y-1 text-sm">
          {links.map((l) => (
            <li key={l.path}>
              <Link
                to={`/dashboard/${wsId}${l.path}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PlatformCommunications() {
  return (
    <div>
      <PageHeader title="Communications" description="Platform-wide email, SMS and WhatsApp operations." />
      <NotConfigured
        title="Platform-wide communications console not built yet"
        description="Deliverability monitoring, sender approvals and provider health are still handled by the existing Communication Control screens."
        points={[
          "Planned: cross-workspace delivery stats, bounce and complaint rates",
          "Planned: sender approval queue with platform-level SLA tracking",
          "Planned: provider outage detection and failover reporting",
        ]}
      />
      <ExistingTools
        links={[
          { label: "Communication Control", path: "/admin/communication" },
          { label: "Sender approvals", path: "/admin/communication/senders" },
        ]}
      />
    </div>
  );
}

export function PlatformAutomations() {
  return (
    <div>
      <PageHeader title="Automations" description="Platform-wide automation and workflow monitoring." />
      <NotConfigured
        title="Automation monitoring not built yet"
        description="There is no cross-workspace automation health view yet. Per-workspace automation logs remain available inside each workspace."
        points={[
          "Planned: failed run queue with retry and dead-letter handling",
          "Planned: stuck enrolment detection across all workspaces",
          "Planned: scheduled job lag and throughput metrics",
        ]}
      />
    </div>
  );
}

export function PlatformIntegrations() {
  return (
    <div>
      <PageHeader title="Integrations" description="Connection health for Stripe, Meta, Twilio, Resend and Google." />
      <NotConfigured
        title="Integration diagnostics not built yet"
        description="Connection status is currently visible per workspace in Settings and Ads Hub."
        points={[
          "Planned: token expiry and refresh failure alerts",
          "Planned: per-provider error rate dashboard",
          "Planned: one-click reconnection prompts sent to workspace owners",
        ]}
      />
    </div>
  );
}

export function PlatformFulfilment() {
  return (
    <div>
      <PageHeader title="Store Fulfilment" description="Automation store orders and delivery projects." />
      <NotConfigured
        title="Platform fulfilment console not migrated yet"
        description="Order fulfilment is still managed in the existing Store Fulfilment screen. The overview page flags paid orders that have no delivery project so nothing is silently missed."
        points={[
          "Planned: reconciliation tool to create missing projects idempotently",
          "Planned: SLA tracking per fulfilment stage",
        ]}
      />
      <ExistingTools
        links={[
          { label: "Store Fulfilment", path: "/admin/store-orders" },
          { label: "Store Catalogue", path: "/admin/store-catalogue" },
        ]}
      />
    </div>
  );
}

export function PlatformContent() {
  return (
    <div>
      <PageHeader title="Blog & Pages" description="Marketing content managed at platform level." />
      <NotConfigured
        title="Content management not migrated yet"
        description="Blog posts are still edited in the existing Blog Manager."
        points={["Planned: scheduled publishing queue", "Planned: SEO checks and content audit log"]}
      />
      <ExistingTools links={[{ label: "Blog Manager", path: "/admin/blog" }]} />
    </div>
  );
}

export function PlatformAcademy() {
  return (
    <div>
      <PageHeader title="Academy & Community" description="Course content and community moderation." />
      <NotConfigured
        title="Academy and community administration not built yet"
        description="Academy courses are file-defined and communities are moderated inside each workspace's Commerce area."
        points={["Planned: platform course catalogue editor", "Planned: cross-workspace moderation queue"]}
      />
    </div>
  );
}

export function PlatformSecurity() {
  return (
    <div>
      <PageHeader title="Security" description="Platform security posture and access review." />
      <NotConfigured
        title="Security console not built yet"
        description="Role assignments and audit history are available now under Platform Staff and Audit Log; deeper security tooling is planned."
        points={[
          "Planned: failed sign-in and suspicious activity monitoring",
          "Planned: periodic access review workflow",
          "Planned: RLS and policy drift checks",
        ]}
      />
    </div>
  );
}

export function PlatformHealth() {
  return (
    <div>
      <PageHeader title="Platform Health" description="Uptime, error rates and background job status." />
      <NotConfigured
        title="Health monitoring not wired yet"
        description="No uptime or error-rate telemetry is collected at platform level yet, so this page intentionally shows no numbers rather than invented ones."
        points={[
          "Planned: edge function error rates and latency",
          "Planned: queue depth and job failure alerts",
          "Planned: database performance summary",
        ]}
      />
    </div>
  );
}

export function PlatformSettings() {
  return (
    <div>
      <PageHeader title="Platform Settings" description="Global configuration and feature flags." />
      <NotConfigured
        title="Global settings not built yet"
        description="Platform-level feature flags, branding defaults and maintenance mode are planned but not implemented."
        points={["Planned: feature flags per plan", "Planned: maintenance mode banner", "Planned: default trial settings"]}
      />
    </div>
  );
}
