import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Copy,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Unplug,
} from "lucide-react";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useAiAgentConnections } from "@/hooks/useAiAgentConnections";
import {
  CAPABILITIES,
  CAPABILITY_CATEGORIES,
  EXAMPLE_COMMANDS,
  MCP_TOOL_COUNT,
  mcpServerUrl,
} from "@/lib/mcp/capabilities";

interface Props {
  workspaceId?: string;
  workspaceName?: string;
}

const CLIENTS = [
  {
    key: "chatgpt",
    name: "ChatGPT",
    description: "Connect ChatGPT so you can ask about your business in a normal chat.",
    steps: [
      "Open chatgpt.com → Settings → Connectors → Advanced and enable Developer mode.",
      "In the chat composer, open the “+” menu and turn on Developer mode.",
      "Choose Add sources → Connect more.",
      "Name the connector “NexusFlo24” and paste the server URL above.",
      "Sign in to NexusFlo24 and approve the connection.",
    ],
  },
  {
    key: "claude",
    name: "Claude",
    description: "Connect Claude as a custom connector to review leads, bookings and campaigns.",
    steps: [
      "Open claude.ai → Settings → Connectors → Add custom connector.",
      "Name it “NexusFlo24” and paste the server URL above.",
      "Sign in to NexusFlo24 and approve the connection.",
      "Enable the connector from the chat composer, then ask Claude about your business.",
    ],
  },
  {
    key: "custom",
    name: "Custom MCP Client",
    description: "Any assistant that supports secure remote tool connections.",
    steps: [
      "Add a remote connector using the server URL above.",
      "Use OAuth authentication — the client registers itself automatically.",
      "Approve the connection when NexusFlo24 asks you to sign in.",
    ],
  },
  {
    key: "developer",
    name: "Developer Connection",
    description: "For building your own integration or testing tools locally.",
    steps: [
      "Point your MCP-capable client at the server URL above.",
      "Authenticate with OAuth 2.1 — access tokens are issued to your user account.",
      "Tool discovery and calls are rate limited and fully audited.",
    ],
  },
] as const;

export default function AiAgentConnectionsTab({ workspaceId, workspaceName }: Props) {
  const { isAdmin } = useWorkspaceRole();
  const { loading, connections, permissions, activity, savePermission, disconnect } =
    useAiAgentConnections(workspaceId);
  const [copied, setCopied] = useState(false);

  const serverUrl = mcpServerUrl();
  const attention = connections.some((c) => c.status !== "active");
  const connected = connections.length > 0;

  const lastSeen = useMemo(() => {
    const times = connections.map((c) => c.last_seen_at).filter(Boolean) as string[];
    if (!times.length) return null;
    return new Date(Math.max(...times.map((t) => new Date(t).getTime())));
  }, [connections]);

  const copy = async () => {
    await navigator.clipboard.writeText(serverUrl);
    setCopied(true);
    toast.success("Server URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = attention ? (
    <Badge variant="destructive" className="gap-1"><CircleAlert className="h-3 w-3" /> Connection requires attention</Badge>
  ) : connected ? (
    <Badge className="gap-1 bg-accent text-accent-foreground"><Check className="h-3 w-3" /> Connected</Badge>
  ) : (
    <Badge variant="secondary" className="gap-1"><Unplug className="h-3 w-3" /> Not connected</Badge>
  );

  const scrollToCapabilities = () =>
    document.getElementById("mcp-capabilities")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1 border-primary-foreground/30 text-primary-foreground">
            <Sparkles className="h-3 w-3" /> AI Agent Connections
          </Badge>
          {statusBadge}
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight">Run your business through conversation</h2>
        <p className="mt-3 max-w-2xl text-sm text-primary-foreground/80">
          Connect your preferred AI assistant to NexusFlo24 and securely manage leads, bookings, campaigns,
          conversations, follow-ups and business updates without digging through menus.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={copy}>
            Connect AI Assistant
          </Button>
          <Button
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            onClick={scrollToCapabilities}
          >
            View Available Capabilities
          </Button>
        </div>
        <p className="mt-6 text-xs text-primary-foreground/60">
          Powered by Model Context Protocol, a secure standard that allows compatible AI assistants to use
          approved NexusFlo24 tools.
        </p>
      </section>

      {/* Marketing intro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your AI assistant can now work with NexusFlo24</CardTitle>
          <CardDescription>
            Connect a compatible AI assistant to your NexusFlo24 workspace and manage your business through
            conversation. No clicking around. No digging through menus. Just ask. Your AI assistant can securely
            retrieve approved business information, review leads, check appointments, analyse campaigns and
            perform authorised actions using NexusFlo24.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={copy} className="gap-2">
            <Bot className="h-4 w-4" /> Connect your AI assistant
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <section>
        <h3 className="text-lg font-semibold">How it works</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
          {[
            "Business owner chats",
            "AI agent understands the request",
            "NexusFlo24 securely executes the approved tool",
            "Business information is returned or updated",
          ].map((step, i, arr) => (
            <div key={step} className="contents">
              <div className="rounded-xl border bg-card p-4 text-sm font-medium">
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {step}
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Example commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Example commands</CardTitle>
          <CardDescription>Things you can ask a connected assistant.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {EXAMPLE_COMMANDS.map((c) => (
            <div key={c.text} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />“{c.text}”
              </span>
              {c.comingSoon && <Badge variant="outline" className="shrink-0 text-xs">Coming Soon</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Connection details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection details</CardTitle>
          <CardDescription>Use this secure endpoint in your AI assistant. No tokens or secrets are shown here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">{serverUrl}</code>
            <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </Button>
          </div>
          <Separator />
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Authentication", "OAuth 2.1 — sign-in required"],
              ["Connected workspace", workspaceName ?? workspaceId ?? "—"],
              ["Available tools", `${MCP_TOOL_COUNT} (${CAPABILITIES.filter((c) => c.available).length} available now)`],
              ["Last connection", lastSeen ? lastSeen.toLocaleString() : "Never"],
              ["Connection status", attention ? "Requires attention" : connected ? "Connected" : "Not connected"],
              ["Requests logged", `${activity.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm font-medium break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Connection options */}
      <section>
        <h3 className="text-lg font-semibold">Connection options</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CLIENTS.map((client) => {
            const conn = connections.find((c) => c.client_key === client.key);
            return (
              <Card key={client.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      <CardDescription>{client.description}</CardDescription>
                    </div>
                    {conn ? (
                      <Badge className="bg-accent text-accent-foreground">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Not connected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="steps" className="border-none">
                      <AccordionTrigger className="py-1 text-sm">Setup instructions</AccordionTrigger>
                      <AccordionContent>
                        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                          {client.steps.map((s) => <li key={s}>{s}</li>)}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="flex flex-wrap gap-2">
                    {conn ? (
                      <>
                        <Button variant="outline" size="sm" onClick={copy}>Manage connection</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={!isAdmin}
                          onClick={async () => {
                            const { error } = await disconnect(conn.id);
                            toast[error ? "error" : "success"](error ? error.message : "Connection removed");
                          }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={copy} className="gap-1.5">
                        <Copy className="h-3.5 w-3.5" /> Connect — copy server URL
                      </Button>
                    )}
                  </div>
                  {conn?.last_seen_at && (
                    <p className="text-xs text-muted-foreground">
                      Last used {new Date(conn.last_seen_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Capabilities */}
      <Card id="mcp-capabilities">
        <CardHeader>
          <CardTitle className="text-base">Current capabilities</CardTitle>
          <CardDescription>Read live from the deployed NexusFlo24 tool manifest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {CAPABILITY_CATEGORIES.map((cat) => {
            const items = CAPABILITIES.filter((c) => c.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{cat}</p>
                <div className="mt-2 space-y-2">
                  {items.map((c) => (
                    <div key={c.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-sm text-muted-foreground">{c.plain}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Permission: {c.group} · {c.readOnly ? "Read-only" : "Write access"}
                        </p>
                      </div>
                      <Badge variant={c.available ? "default" : "outline"}>
                        {c.available ? "Available" : "Coming Soon"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> You remain in control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "You must sign in to NexusFlo24 before any assistant can connect.",
              "AI assistants can only access approved workspace information.",
              "Your existing NexusFlo24 roles and permissions still apply.",
              "Every request is linked to the authenticated user.",
              "Workspace access is validated before every tool call.",
              "Connections can be revoked at any time.",
              "High-risk actions require approval before they run.",
              "Every successful, rejected and failed action is logged.",
            ].map((s) => (
              <li key={s} className="flex gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <McpPermissionsPanelLazy
        loading={loading}
        permissions={permissions}
        canEdit={!!isAdmin}
        onChange={async (g, patch) => {
          const { error } = await savePermission(g, patch);
          if (error) toast.error(error.message);
        }}
      />

      <ActivityLogLazy activity={activity} />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Terminal className="h-3.5 w-3.5" />
        Write actions are disabled in this release. They stay behind workspace permissions and in-app approval.
      </p>
    </div>
  );
}

import McpPermissionsPanel from "./ai-agents/McpPermissionsPanel";
import McpActivityLog from "./ai-agents/McpActivityLog";
import type { McpActivity, McpPermission } from "@/hooks/useAiAgentConnections";

function McpPermissionsPanelLazy(props: {
  loading: boolean;
  permissions: McpPermission[];
  canEdit: boolean;
  onChange: (g: McpPermission["permission_group"], patch: Partial<McpPermission>) => void;
}) {
  if (props.loading) return null;
  return <McpPermissionsPanel permissions={props.permissions} canEdit={props.canEdit} onChange={props.onChange} />;
}

function ActivityLogLazy({ activity }: { activity: McpActivity[] }) {
  return <McpActivityLog activity={activity} />;
}
