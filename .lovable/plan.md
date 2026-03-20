

## Fix: Domain List Showing All Domains Instead of Workspace-Specific Ones

### Problem
The `ResendDomainPanel` calls `resend-domain-verify` with `action: "list"`, which calls the Resend API's `GET /domains` endpoint. This returns **all domains** registered under the Resend API key — not just the ones belonging to the current workspace. When workspaces share the platform Resend key, every user sees every domain (including other users' domains like `kizioo.com`).

### Solution
Track domain ownership per workspace in the database and filter the domain list accordingly.

### Changes

**1. Database migration — create `workspace_domains` table**
- Columns: `id`, `workspace_id`, `resend_domain_id` (text), `domain_name`, `status`, `created_at`
- RLS: workspace members can SELECT; workspace admins can INSERT/DELETE
- When a domain is added via the "add" action, store the mapping

**2. `supabase/functions/resend-domain-verify/index.ts`**
- **`add` action**: After successfully adding a domain via Resend API, insert a row into `workspace_domains` with the `resend_domain_id` and `workspace_id`
- **`list` action**: Instead of returning all Resend domains, query `workspace_domains` for the current workspace, then fetch status from Resend only for those domain IDs
- **`verify` / `status` actions**: Verify the requested `domainId` belongs to the workspace before proceeding (prevents cross-workspace access)

**3. `src/components/settings/ChannelSettingsTab.tsx`**
- No UI changes needed — the filtered list from the backend will automatically show only the workspace's domains

### Security
- Each workspace only sees and manages its own domains
- Domain ownership is enforced server-side via the `workspace_domains` table
- Cross-workspace domain access is blocked by checking ownership before any Resend API call

