## Diagnosis

WhatsApp delivery is **not broken**. The Meta integration is working — earlier today (14:31 UTC) the same automation successfully sent three WhatsApp messages from this workspace with `credentialSource: workspace` and real `wamid` IDs returned by Meta.

What changed: the workspace has **run out of WhatsApp credits** (and SMS credits).

### Evidence from the database

`message_credits` row for the active workspace `95bc7e99-798e-49ef-a5c3-ab68bbc08950`:
- `email_balance: 500` ✅
- `sms_balance: 0` ❌
- `whatsapp_balance: 0` ❌

Most recent `automation_logs` for this run:
```
action:send_email     → success
action:send_whatsapp  → error  "Insufficient whatsapp credits. Buy more in Settings → Usage."
action:send_sms       → error  "Insufficient sms credits. Buy more in Settings → Usage."
```

The credit check in `execute-automation/index.ts` (line 261-267) calls `deductCredit()` *before* the WhatsApp HTTP call. With balance at 0 it throws and the step is logged as `error`. The WhatsApp Cloud API is never contacted, which is why there's no entry in `whatsapp_messages` and no error in the `whatsapp-send` edge logs.

### Why earlier WhatsApp sends worked

The Plus plan only includes 100 WhatsApp credits/month. Looking at `automation_logs` for today, the user has already burned through them on previous runs (3 successful WhatsApp sends in one run alone, plus likely many more across the test sessions).

## Fix

Two parts: top up the workspace immediately (so the user can verify it works), and improve the engine so credit-exhaustion is reported clearly instead of looking like a "WhatsApp broken" failure.

### 1. Top up credits for the affected workspace

Add a one-off credit grant via migration:
- `+200 whatsapp` credits
- `+200 sms` credits
- Logged in `credit_transactions` with reason `manual_topup`

This unblocks the user immediately so they can confirm the automation fires end-to-end.

### 2. Distinguish "no credits" from "send failed" in the automation engine

In `supabase/functions/execute-automation/index.ts`:

- Wrap the `deductCredit()` call so when `allowed: false`, the step is logged with `event_type: action:send_whatsapp` and a dedicated `status: insufficient_credits` (instead of the generic `error`). Same for `send_sms` and `send_email`.
- Include the channel and remaining balance in `details` so the UI can render a friendly "Top up credits" CTA instead of a red error chip.

### 3. Surface low-credit warnings in the Automation Details drawer

In `src/components/automations/AutomationDetailsDrawer.tsx` (Logs tab):
- When a log row has `status: insufficient_credits`, render an amber alert with the channel name and a "Top up in Settings → Usage" link button (route: `/dashboard/:workspaceId/settings?tab=usage`) instead of the generic red error icon.
- Add a one-line banner at the top of the Logs tab if any recent step failed with `insufficient_credits`, explaining the automation will resume sending on that channel as soon as credits are available.

### 4. Pre-flight credit check on automation activation (optional polish)

In `useAutomations` (or the `Activate` mutation), before flipping `status` to `active`, fetch the workspace's `message_credits` and warn (toast) if any channel used by the automation's steps has 0 balance. This prevents the user from launching a workflow that's guaranteed to fail mid-flight.

## Files to change

- `supabase/migrations/<new>_topup_workspace_credits.sql` — credit grant + transaction log
- `supabase/functions/execute-automation/index.ts` — split credit-exhaustion from generic errors
- `src/components/automations/AutomationDetailsDrawer.tsx` — friendly insufficient-credits UI in Logs tab
- `src/hooks/useAutomations.ts` — optional pre-flight credit warning on activation

## What the user will see after the fix

1. The current workflow run resumes — next WhatsApp step in the schedule will fire successfully (credits restored).
2. If credits ever run out again, the Logs tab shows a clear "Out of WhatsApp credits — top up to resume" message with a direct link, instead of looking like the WhatsApp integration is broken.
3. Activating an automation with a channel at 0 credits shows a warning toast.
