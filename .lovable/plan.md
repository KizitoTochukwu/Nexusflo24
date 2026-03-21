

## Plan: Exempt Admin Users from Credit Deduction

### Problem
The admin bypass logic exists in `credit-guard.ts` (line 50-61) but only works when `userId` is passed. The `execute-automation` function:
1. **Email**: Sends directly via Resend API, completely bypassing the credit guard
2. **WhatsApp**: Calls `whatsapp-send` with service-role but doesn't pass `skipCredits: true`
3. **SMS**: Sends directly via Twilio, completely bypassing the credit guard

Additionally, the `skipCredits` flow in `email-send`, `sms-send`, and `whatsapp-send` requires the workspace **owner** to be admin — but the correct check should be whether the **caller** (or workspace owner) is admin.

### Changes

#### 1. Update `execute-automation/index.ts`
- Import `deductCredit` and `isAdminUser` from `credit-guard.ts`
- Before executing send actions (email, SMS, WhatsApp), check if the workspace owner is an admin
- For **email** and **SMS** (sent directly): add credit deduction calls with admin bypass
- For **WhatsApp** (delegated to `whatsapp-send`): pass `skipCredits: true` when workspace owner is admin

#### 2. Update `execute-campaign/index.ts` (if applicable)
- Ensure `skipCredits: true` is passed to channel send functions when workspace owner is admin

#### 3. Verify existing `credit-guard.ts` admin bypass
- The existing admin bypass logic is sound — no changes needed there

### Technical Detail

In `execute-automation/index.ts`, before the action loop, resolve whether the workspace owner is admin:
```typescript
const { data: ws } = await supabase.from("workspaces").select("owner_user_id").eq("id", workspace_id).single();
const ownerIsAdmin = ws?.owner_user_id ? await isAdminUser(ws.owner_user_id) : false;
```

Then for each send action:
- If `ownerIsAdmin` is false, call `deductCredit()` and abort on insufficient credits
- If `ownerIsAdmin` is true, skip credit deduction (log as `admin_exempt`)

For the WhatsApp delegated call, add `skipCredits: true` to the request body when `ownerIsAdmin`.

