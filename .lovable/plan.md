

## Plan: Exempt Admin Users from Credit Deduction

### Problem
Admin users are blocked by the credit system when sending WhatsApp, SMS, or email messages. They should have unlimited free messaging.

### Approach
Add an admin-check to the shared `credit-guard.ts` utility so that when a user with the `admin` role sends a message, credits are not deducted and the request is always allowed.

### Changes

**1. Update `credit-guard.ts` — add `isAdminUser` helper and modify `deductCredit`**
- Add a new optional `userId` parameter to `deductCredit(workspaceId, channel, referenceId?, userId?)`
- When `userId` is provided, query the `user_roles` table for `role = 'admin'`
- If admin, return `{ allowed: true, remaining: 999999 }` immediately — no balance check, no deduction
- Log the transaction as `reason: "admin_exempt"` for audit trail

**2. Update all 3 send Edge Functions to pass `userId` into `deductCredit`**
- `whatsapp-send/index.ts` — extract user ID from claims/service-role context, pass to `deductCredit`
- `email-send/index.ts` — same pattern
- `sms-send/index.ts` — same pattern
- For service-role calls (internal/campaign), no userId is passed so normal credit logic applies

**3. Redeploy affected Edge Functions**
- `whatsapp-send`, `email-send`, `sms-send`, and any function importing `credit-guard` (e.g. `execute-automation`, `execute-campaign`)

### Technical Detail

```text
deductCredit(workspaceId, channel, referenceId?, userId?)
  │
  ├─ userId provided?
  │   ├─ Query user_roles WHERE user_id = userId AND role = 'admin'
  │   ├─ If admin → return { allowed: true, remaining: 999999 }
  │   └─ If not admin → continue normal flow
  │
  └─ Normal credit check / deduct flow (unchanged)
```

No database migrations needed — the `user_roles` table already exists with the admin role.

