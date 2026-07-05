import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeadsTool from "./tools/list-leads";
import createLeadTool from "./tools/create-lead";
import listCampaignsTool from "./tools/list-campaigns";
import listWorkspacesTool from "./tools/list-workspaces";

// Build the OAuth issuer from the Supabase project ref only. Vite inlines this
// literal at build time so the module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexusflo24-mcp",
  title: "NexusFlo24 MCP",
  version: "0.1.0",
  instructions:
    "Tools for NexusFlo24 — an AI-powered marketing automation platform. Use `list_workspaces` first to find the caller's workspace_id, then `list_leads`, `create_lead`, and `list_campaigns` to work with their CRM and campaigns.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWorkspacesTool, listLeadsTool, createLeadTool, listCampaignsTool],
});
