## Root cause

The recent "close the four gaps" audit added `requireInternalCaller(req)` to `execute-campaign`, `execute-automation`, and `execute-workflow`. That guard only accepts callers presenting the **service-role key** or the `INTERNAL_FUNCTION_SECRET` header.

But the browser still invokes these three functions directly with the user's anon/user JWT:

- `src/components/campaigns/CreateCampaignDialog.tsx` (broadcast "Send Now" auto-fire)
- `src/components/campaigns/CampaignDetailsDrawer.tsx` (manual re-send)
- `src/components/automations/SequenceHealthPanel.tsx` and `ExecutionHistoryTable.tsx`
- `src/hooks/useWorkflows.ts` (manual workflow run + test-run)

Every one of those calls now gets a **403 Forbidden** from the guard, which supabase-js surfaces as the generic "Failed to send a request to the Edge Function" toast the screenshot shows. Scheduled/internal callers (cron, `check-campaign-triggers`, `execute-workflow` → `execute-automation`) still work because they use the service-role key.

The other two guarded functions (`enroll-workflow-leads`, `check-campaign-triggers`) are only called server-to-server, so they can stay internal-only.

## Fix

Introduce a second guard that accepts **either** an internal caller **or** an authenticated user who is a member of the target workspace, and swap the three user-facing functions to use it.

### 1. New shared helper — `supabase/functions/_shared/caller-auth.ts`

```ts
export async function requireInternalOrWorkspaceMember(
  req: Request,
  adminClient: any,
  workspaceId: string,
): Promise<Response | null>
```

Logic:
1. If `requireInternalCaller(req)` returns `null` → allow (service-role / internal secret path unchanged).
2. Otherwise, extract the bearer token from `Authorization`. Resolve the user via `adminClient.auth.getClaims(token)` (per project convention — memory rule).
3. Check membership: `workspaces.owner_user_id = user.id` OR row in `workspace_members` for `(workspace_id, user_id)`. Also allow platform admins via existing `isAdminUser(user.id)`.
4. Return `null` on success, `403` JSON otherwise.

### 2. Update `execute-campaign/index.ts`

- Remove the top-level `requireInternalCaller` call.
- After loading `campaign` (to know `workspace_id`), call `requireInternalOrWorkspaceMember(req, supabase, campaign.workspace_id)`; return its response if non-null.
- Keep everything else identical.

### 3. Update `execute-automation/index.ts`

Same pattern: fetch the `automation` first to get `workspace_id`, then authorize. The current top-of-handler guard is removed.

### 4. Update `execute-workflow/index.ts`

Same pattern: fetch the `workflow` first, then authorize on its `workspace_id`.

### 5. Leave internal-only functions unchanged

`enroll-workflow-leads` and `check-campaign-triggers` keep `requireInternalCaller` — they are only invoked server-side.

## Out of scope

- No changes to `whatsapp-send`, WA pacing helper, template-category compliance, or webhook status transitions from the earlier audit.
- No UI changes; the existing toasts already surface success/failure once the 403 is resolved.
- No RLS / migration changes — membership check uses existing tables.

## Verification

After deploy:
1. From the preview, create a broadcast "Send Now" campaign → toast should read `Campaign sent! N delivered`.
2. `Send now` from `CampaignDetailsDrawer` on an existing campaign → same.
3. `Run now` on an automation from `SequenceHealthPanel` → success toast, no 403.
4. `Test run` and manual run of a workflow from the workflow editor → success.
5. Cron-driven `check-campaign-triggers` → still works (service-role path unchanged), confirmed via edge function logs.
