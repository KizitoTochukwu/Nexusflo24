import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspacesTool from "./tools/list-workspaces";
import getWorkspaceSummaryTool from "./tools/get-workspace-summary";
import listLeadsTool from "./tools/list-leads";
import getLeadTool from "./tools/get-lead";
import listHotLeadsTool from "./tools/list-hot-leads";
import listCampaignsTool from "./tools/list-campaigns";
import getCampaignPerformanceTool from "./tools/get-campaign-performance";
import listAppointmentsTool from "./tools/list-appointments";
import listConversationsTool from "./tools/list-conversations";
import listAutomationsTool from "./tools/list-automations";
import getWorkspaceAnalyticsTool from "./tools/get-workspace-analytics";
import createLeadTool from "./tools/create-lead";

// Build the OAuth issuer from the Supabase project ref only. Vite inlines this
// literal at build time so the module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexusflo24-mcp",
  title: "NexusFlo24 AI Agent Connections",
  version: "0.2.0",
  instructions:
    "Tools for NexusFlo24 — an AI-powered marketing automation platform. Call `list_workspaces` first to find the caller's workspace_id, then use the read tools (`get_workspace_summary`, `list_leads`, `get_lead`, `list_hot_leads`, `list_campaigns`, `get_campaign_performance`, `list_appointments`, `list_conversations`, `list_automations`, `get_workspace_analytics`) to answer questions about their business. All list results are capped at 50 rows. Write actions are disabled unless the workspace owner has explicitly enabled them in Settings → AI Agent Connections.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listWorkspacesTool,
    getWorkspaceSummaryTool,
    listLeadsTool,
    getLeadTool,
    listHotLeadsTool,
    listCampaignsTool,
    getCampaignPerformanceTool,
    listAppointmentsTool,
    listConversationsTool,
    listAutomationsTool,
    getWorkspaceAnalyticsTool,
    createLeadTool,
  ],
});
