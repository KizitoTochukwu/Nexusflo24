## AI Agent Connections

A premium page under **Settings → Integrations → AI Agent Connections** that lets a workspace owner connect ChatGPT, Claude, or a custom MCP client to NexusFlo24 and run their business through conversation. Backed by the already-deployed, OAuth-secured MCP server at `/functions/v1/mcp` (currently exposing 4 tools: `list_workspaces`, `list_leads`, `create_lead`, `list_campaigns`).

### 1. Route and navigation

- New tab `ai-agents` inside Settings, surfaced within the Integrations area (deep-linkable at `/dashboard/:workspaceId/settings?tab=ai-agents`). No new primary sidebar item.
- New component `src/components/settings/AiAgentConnectionsTab.tsx` plus sub-components under `src/components/settings/ai-agents/`.

### 2. Page structure

- **Hero** (dark navy, cyan/green accents): "Run your business through conversation", the given subheadline, primary CTA *Connect AI Assistant*, secondary CTA *View Available Capabilities* (scrolls to capabilities), and a live status badge (Not connected / Connected / Connection requires attention) derived from real `mcp_connections` rows.
- **Feature-introduction block** with the supplied marketing copy and CTA.
- **How it works**: 4 bordered cards with arrows (chat → agent understands → NexusFlo24 executes approved tool → info returned/updated), stacked on mobile.
- **Example commands**: the 8 prompts; the write-action ones (draft follow-up, move stage) tagged **Coming Soon**.
- **Connection cards**: ChatGPT, Claude, Custom MCP Client, Developer Connection — each with description, real status, Connect button, expandable setup steps, and Manage/Disconnect when a real connection exists. No fake connected states.
- **Connection details panel**: MCP server URL built dynamically from `VITE_SUPABASE_PROJECT_ID` with a copy button, OAuth status, connected workspace, tool count read from the manifest, last connection time, connection status. No tokens or secrets rendered.
- **Current capabilities**: tools read from the live manifest, grouped into CRM & Leads / Campaigns / Bookings / Messages / Automations / Analytics, each showing plain-English description, read-only vs write, availability (Available / Coming Soon), and required permission.
- **You remain in control**: the 8 security statements.
- **Permissions UI**: 8 groups with No Access / View Only / Create & Update / Full Access, plus a "Require approval before execution" toggle on high-risk groups, defaulted on for messaging, campaign publishing, automation activation, bulk and destructive actions.
- **Activity log**: table of date/time, assistant, user, workspace, tool, action summary, risk level, approval status, execution status, view-details drawer; filters for date, tool, assistant, workspace, status, risk.

### 3. Database (new migration)

Tables, all with `workspace_id`, RLS enabled, and explicit GRANTs:

- `mcp_connections` — client label (chatgpt/claude/custom/developer), oauth client_id, status, last_seen_at, created_by. No tokens stored.
- `mcp_tool_permissions` — workspace_id, group, access_level, require_approval.
- `mcp_tool_activity` — workspace_id, user_id, client_id, tool_name, summary, risk_level, approval_status, execution_status, error_code, created_at. Redacted payload summary only.
- `mcp_action_approvals` — pending high-risk actions with requester, tool, args digest, decision, decided_by/at.
- `mcp_rate_limits` — per user + workspace + window counters.

RLS: read/write only for members of the workspace (via existing `workspace_members`), admin/owner role required for permission and connection mutations; `service_role` full access for the edge function.

### 4. MCP tool hardening and the read-only beta

- Add a shared `src/lib/mcp/guard.ts`: resolve user from the verified token, load workspace membership server-side, reject any `workspace_id` the caller isn't a member of, check `mcp_tool_permissions`, apply rate limits, cap results at 50, and write an audit row for allowed/rejected/failed calls.
- Wire every existing tool through the guard.
- Add the remaining read-only beta tools: `get_workspace_summary`, `get_lead`, `list_hot_leads`, `get_campaign_performance`, `list_appointments`, `list_conversations`, `list_automations`, `get_workspace_analytics`.
- `create_lead` moves behind the permission check and defaults to disabled — the first release ships read-only. Future write tools stay unexposed and are shown as Coming Soon in the UI.
- Regenerate the manifest and redeploy the `mcp` edge function.

### 5. Verification before claiming availability

- Live probe of the OAuth resource metadata and unauthenticated 401 on tool discovery.
- Authenticated list-tools call confirming the new tool set matches the manifest.
- One real read-only tool call proving workspace scoping, the 50-row cap, and an audit row landing in `mcp_tool_activity`.
- A cross-workspace attempt confirming rejection plus a rejected audit row.
- Statuses in the UI stay "Not connected" until a real `mcp_connections` row exists.

### Reporting after implementation
Page route, database changes, exposed tools, permission rules, security controls, test results, and remaining issues.

### Technical notes
The MCP endpoint URL is derived as `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp` so it survives publish. Connection records are created by the OAuth consent flow (client_id from the token), never fabricated client-side. Tool metadata is read from `.lovable/mcp/manifest.json` imported at build time, so the capability list always matches the deployed server.
