# Email Diagnostics + Delivery Visibility + Test Send

## Diagnostic findings (already run)

**Recent email_logs (last few sends):**
- All 7 most recent rows show `status = sent`, `error = NULL`. No bounces/complaints currently logged in our `email_logs` table.
- Recipients include `kizioostore@gmail.com`, `Kizzyadichie@gmail.com`, `coataling@gmail.com`, `dannypham509@gmail.com`. All marked sent by Resend.

**Suppression check:** 0 leads carry the `unsubscribed` or `suppressed` tag — nothing is being silently blocked at the lead level.

**Recent automation_logs (last 7 days):** Email steps are firing successfully (`action:send_email / success`). The errors that DO appear are SMS/WhatsApp credit failures, not email. Conclusion: emails ARE being dispatched. If they don't arrive, the cause is downstream (spam folder, recipient filters, Resend bounce/complaint we never recorded back, or domain reputation for `noreply@nexusflo24.com`).

We need (a) better visibility so the user can see this themselves, and (b) a quick way to test deliverability without waiting for a real automation run.

---

## Part 1 — Per-step delivery status in the automation logs view

Upgrade the Logs tab in `AutomationDetailsDrawer.tsx` so each `action:send_email` row shows the actual delivery info from `email_logs`, not just "success".

What changes:
- New hook `useAutomationEmailDeliveries(automationId)` — fetches the most recent `email_logs` rows for leads that ran through this automation (joined by `lead_id` + `workspace_id`, last 30 days). Returns a `Map<lead_id, { status, to_email, provider_message_id, error, created_at }>`.
- In each `action:send_email` log row, render a small delivery badge using that map:
  - `sent` → green "Delivered to provider" with the recipient email + Resend message ID (truncated, copyable).
  - `error` / missing → red "Delivery failed" with the error message.
  - no match within ±2 min → grey "Awaiting log".
- Add a 4th filter chip: "Email issues" — surfaces only `action:send_email` rows whose matched `email_logs` row is missing or has `error`.
- Add a help line above the table: "Delivered to provider = Resend accepted the email. Check the recipient's spam folder if it didn't arrive — bounces/complaints are tracked separately."

## Part 2 — "Test send" button in the email step editor

In `src/components/automations/email-editor/AutomationEmailEditor.tsx` (email branch only, `isEmail === true`), add a "Send test" button in the toolbar next to Preview.

Behavior:
- Opens a small popover with: recipient email field (defaults to the logged-in user's email), and a "Send test" button.
- On click, calls the existing `email-send` Edge Function with the current `subject` + `message` (rendered the same way a live automation would, including the user's template settings) to the entered address.
- Uses a special `templateSettings.preview = true` flag so the function can:
  - skip credit deduction for tests,
  - skip tracking pixel/link rewriting,
  - prefix the subject with `[TEST]`,
  - still log to `email_logs` with `status = sent` so the test is auditable.
- Shows a toast: "Test sent to <email>. Check your inbox (and spam folder)."
- Disabled if `subject` or `message` is empty.

Edge function change (`supabase/functions/email-send/index.ts`):
- Honor `templateSettings.preview === true` → skip `deductCredit`, skip pixel + link rewrite, prefix subject with `[TEST] `.

## Part 3 — Small follow-ups

- Add a tooltip in the email step editor next to the From line: "Sent from `noreply@nexusflo24.com` via Resend. To improve deliverability, configure your own sending domain in Settings → Channels → Email."
- In `AutomationDetailsDrawer` empty-state for logs, mention the new Test Send flow as a way to validate without waiting for a trigger.

---

## Technical notes

**Files edited**
- `src/hooks/useAutomations.ts` — add `useAutomationEmailDeliveries(automationId)` query.
- `src/components/automations/AutomationDetailsDrawer.tsx` — render delivery badges in `action:send_email` rows + add "Email issues" filter.
- `src/components/automations/email-editor/AutomationEmailEditor.tsx` — Test Send popover (email branch only) + sender domain tooltip.
- `supabase/functions/email-send/index.ts` — honor `templateSettings.preview` to skip credits + tracking and prefix `[TEST]`.

**No DB migrations required** — `email_logs` already stores everything we need (`status`, `error`, `provider_message_id`, `lead_id`).

**Edge function deploy**
- Redeploy `email-send` after the change.

**Security**
- Test send must require an authenticated user (it already does — `email-send` rejects without `Authorization`).
- The recipient field is free-text but only the logged-in user can trigger it, and credits are skipped only when called by an authenticated user with `templateSettings.preview = true` — never by service role / automation runs.
