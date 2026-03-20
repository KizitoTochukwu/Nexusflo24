

## Fix: Allow Only Admin Users to Bypass Credit Deduction

### Problem
The admin credit bypass in `credit-guard.ts` already exists, but it only works when a `userId` is passed. The AI Sales Closer calls `whatsapp-send` and `email-send` using the service role key (no `userId`), so the admin bypass never triggers and AI auto-replies are silently blocked by insufficient credits (402).

### Solution
Add a `skipCredits` flag to the send functions, gated behind service-role authentication only. The AI Sales Closer will pass this flag so auto-replies aren't blocked. Manual user sends continue to go through the normal credit check with admin bypass.

### Changes

**1. `supabase/functions/whatsapp-send/index.ts`**
- Accept `skipCredits` boolean from request body
- Only honor it when `isServiceRole === true`
- Skip the `deductCredit` call when both conditions are met

**2. `supabase/functions/email-send/index.ts`**
- Same `skipCredits` pattern as whatsapp-send

**3. `supabase/functions/sms-send/index.ts`**
- Same `skipCredits` pattern

**4. `supabase/functions/ai-sales-closer/index.ts`**
- In `sendMessage()`, add `skipCredits: true` to the request body for both WhatsApp and email calls
- Add response status checking to log delivery failures

### Security
- `skipCredits` is only honored for service-role callers (internal system calls)
- Client-side/user calls cannot abuse this flag
- Admin users sending manually still bypass via the existing `userId` check in `credit-guard.ts`

