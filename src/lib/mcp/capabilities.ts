import manifest from "../../../.lovable/mcp/manifest.json";

export type PermissionGroup =
  | "crm"
  | "messages"
  | "bookings"
  | "campaigns"
  | "automations"
  | "funnels"
  | "analytics"
  | "settings";

export type AccessLevel = "none" | "view" | "write" | "full";

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  none: "No Access",
  view: "View Only",
  write: "Create and Update",
  full: "Full Access",
};

export const PERMISSION_GROUPS: {
  key: PermissionGroup;
  label: string;
  description: string;
  highRisk: boolean;
}[] = [
  { key: "crm", label: "CRM and Leads", description: "Leads, stages, scores and notes.", highRisk: false },
  { key: "messages", label: "Messages", description: "Email, SMS and WhatsApp conversations.", highRisk: true },
  { key: "bookings", label: "Bookings", description: "Appointments and booking pages.", highRisk: true },
  { key: "campaigns", label: "Campaigns", description: "Broadcasts and campaign performance.", highRisk: true },
  { key: "automations", label: "Automations", description: "Workflows, triggers and runs.", highRisk: true },
  { key: "funnels", label: "Funnels", description: "Funnels, steps and conversions.", highRisk: false },
  { key: "analytics", label: "Analytics", description: "Business reporting and summaries.", highRisk: false },
  { key: "settings", label: "Workspace Settings", description: "Workspace profile and configuration.", highRisk: true },
];

/** Groups that default to "approval required" for any write action. */
export const APPROVAL_BY_DEFAULT: PermissionGroup[] = [
  "messages",
  "campaigns",
  "automations",
  "bookings",
  "settings",
];

export type CapabilityCategory =
  | "CRM and Leads"
  | "Campaigns"
  | "Bookings"
  | "Messages"
  | "Automations"
  | "Analytics";

type CapabilityMeta = {
  category: CapabilityCategory;
  plain: string;
  group: PermissionGroup;
};

/** Plain-English descriptions for the tools the MCP server advertises. */
export const CAPABILITY_META: Record<string, CapabilityMeta> = {
  list_workspaces: { category: "Analytics", plain: "See which NexusFlo24 workspaces you belong to.", group: "settings" },
  get_workspace_summary: { category: "Analytics", plain: "Get a snapshot of leads, bookings, campaigns and automations.", group: "analytics" },
  get_workspace_analytics: { category: "Analytics", plain: "Report on performance over the last 30 days.", group: "analytics" },
  list_leads: { category: "CRM and Leads", plain: "Find and review your most recent leads.", group: "crm" },
  get_lead: { category: "CRM and Leads", plain: "Look up the full details of one lead.", group: "crm" },
  list_hot_leads: { category: "CRM and Leads", plain: "Identify the leads most likely to convert right now.", group: "crm" },
  create_lead: { category: "CRM and Leads", plain: "Add a new lead to your CRM.", group: "crm" },
  list_campaigns: { category: "Campaigns", plain: "Review your email, SMS and WhatsApp campaigns.", group: "campaigns" },
  get_campaign_performance: { category: "Campaigns", plain: "Check sends, opens, clicks and conversions.", group: "campaigns" },
  list_appointments: { category: "Bookings", plain: "Check upcoming appointments in your calendar.", group: "bookings" },
  list_conversations: { category: "Messages", plain: "Summarise recent customer conversations.", group: "messages" },
  list_automations: { category: "Automations", plain: "Review automations, their status and last run.", group: "automations" },
};

export type Capability = {
  name: string;
  title: string;
  readOnly: boolean;
  category: CapabilityCategory;
  plain: string;
  group: PermissionGroup;
  available: boolean;
};

type ManifestTool = {
  name: string;
  title?: string;
  description?: string;
  annotations?: { readOnlyHint?: boolean };
};

const manifestTools = ((manifest as { mcp?: { tools?: ManifestTool[] } }).mcp?.tools ?? []) as ManifestTool[];

/** Live capability list read from the deployed MCP tool manifest. */
export const CAPABILITIES: Capability[] = manifestTools.map((t) => {
  const meta = CAPABILITY_META[t.name];
  const readOnly = t.annotations?.readOnlyHint !== false;
  return {
    name: t.name,
    title: t.title ?? t.name,
    readOnly,
    category: meta?.category ?? "Analytics",
    plain: meta?.plain ?? t.description ?? "",
    group: meta?.group ?? "analytics",
    // The first release ships read-only. Write tools exist but stay gated
    // behind workspace permissions + approval, so they are not "available".
    available: readOnly,
  };
});

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  "CRM and Leads",
  "Campaigns",
  "Bookings",
  "Messages",
  "Automations",
  "Analytics",
];

export const MCP_TOOL_COUNT = CAPABILITIES.length;

/** Public MCP endpoint for this deployment. Not a secret. */
export function mcpServerUrl(): string {
  const ref = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${ref}.supabase.co/functions/v1/mcp`;
}

export const EXAMPLE_COMMANDS: { text: string; comingSoon?: boolean }[] = [
  { text: "Show my hot leads." },
  { text: "Which leads have not been followed up?" },
  { text: "List my appointments for this week." },
  { text: "Summarise my latest customer conversations." },
  { text: "Show campaign performance for this month." },
  { text: "Which automations failed recently?" },
  { text: "Create a follow-up draft for this prospect.", comingSoon: true },
  { text: "Move this qualified lead to the opportunity stage.", comingSoon: true },
];
