

## Fix: Restrict skipCredits to Admin-Owned Workspaces Only

### Current State
`skipCredits` bypasses credit checks for **any** service-role caller. The AI Sales Closer always passes `skipCredits: true`, meaning all workspaces get free AI auto-replies regardless of whether the workspace owner is an admin.

### Proposed Change
Instead of blindly trusting `skipCredits`, the send functions should verify that the workspace is owned by an admin user before skipping credits.

### Changes

**1. `supabase/functions/_shared/credit-guard.ts`**
- Export the existing `isAdminUser` function so send functions can reuse it.

**2. `supabase/functions/whatsapp-send/index.ts`**
- When `isServiceRole && skipCredits`, look up the workspace's `owner_user_id` from `workspaces` table.
- Call `isAdminUser(ownerUserId)` — only skip credit deduction if the owner is an admin.
- If not admin, proceed with normal credit deduction.

**3. `supabase/functions/email-send/index.ts`**
- Same pattern as whatsapp-send.

**4. `supabase/functions/sms-send/index.ts`**
- Same pattern as sms-send.

### Logic (applied to all three send functions)
```typescript
import { deductCredit, isAdminUser } from "../_shared/credit-guard.ts";

let shouldDeduct = true;
if (isServiceRole && skipCredits) {
  // Verify workspace owner is admin before bypassing
  const { data: ws } = await adminClient
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .single();
  if (ws?.owner_user_id) {
    shouldDeduct = !(await isAdminUser(ws.owner_user_id));
  }
}
if (shouldDeduct) {
  const creditResult = await deductCredit(workspaceId, channel, ...);
  if (!creditResult.allowed) return 402;
}
```

### Security
- Only admin-owned workspaces get free AI auto-replies
- Regular workspace owners still consume credits for AI auto-replies
- Manual sends by admin users continue to bypass via the existing `userId` check in `credit-guard.ts`
- No database changes needed

