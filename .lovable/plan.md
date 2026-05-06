## Change B — Don't let one failed action nuke the entire sequence

### Problem (recap from the screenshot)

When an action step throws (e.g. Twilio "Authenticate" / Resend "API key is invalid"), the engine logs `status: "error"` for that step. But every later step in the same automation invocation appears in the timeline as `action:skipped` with reason **"Skipped due to earlier condition or delay"** — the user is seeing 6+ red `action:skipped` rows after a single bad credential.

### Root cause

In `supabase/functions/execute-automation/index.ts`:

- The `send_sms` and `send_whatsapp` action branches do **not** wrap the provider call in a `try/catch` (only `send_email` does). When Twilio / WhatsApp throws, the error escapes the inner `case` block and is caught by the outer `catch (stepErr)` at line ~917.
- That outer catch sets `status = "error"` but **also** any other unexpected throw further up the loop body bubbles out of the `for` loop entirely. More importantly, the recovery flow (`automations-recover`) and the `process-scheduled-jobs` resume path can re-enqueue the same step and observe a stale skip flag in some edge cases.
- Combined with the `skipRemaining` flag check at line 307, any path that accidentally trips `skipRemaining = true` (or any future code added inside the action `case` that does so) kills the whole chain.

The codebase already has a comment on the condition branch (lines 772–786) explicitly saying *"A failed condition must NOT halt the rest of the automation."* We need to apply the same rule to **failed actions**.

### Fix

Two small, surgical edits to `supabase/functions/execute-automation/index.ts`:

1. **Wrap `send_sms` and `send_whatsapp` in try/catch** so a thrown provider error never escapes the action `case`. On failure, set `status = "error"`, capture `details.error`, fire `notifyCredentialFailure` if `isCredentialError(...)` is true (matching the existing `send_email` behavior), and `break` — exactly mirroring the pattern at lines 412–431.

2. **Harden the outer `catch (stepErr)` at line 917** to:
   - Still set `status = "error"` and log the step.
   - Explicitly **never** set `skipRemaining = true`, and add a comment saying so.
   - For send actions, also call `notifyCredentialFailure` when the error message matches `isCredentialError(channel, msg)` so credential alerts fire even if the throw came from an unexpected codepath.

The `skipRemaining = true` lines that stay are only the legitimate ones:
- `end_automation` action (line 632) — user explicitly asked to end.
- `condition` with `halt_on_fail: true` (line 785) — explicit opt-in.
- `delay` step variants (lines 810, 839, 909) — delays must pause the chain so it can resume from `scheduled_jobs`.

### Result

- Bad Resend / Twilio / WhatsApp credentials → only the affected send shows red. Subsequent delays, follow-up emails on a different channel, tag updates, status changes, and assignment steps all still run.
- Workspace owner still gets the credential alert via `notifyCredentialFailure` (deduped 6h per channel — already implemented).
- No schema changes, no UI changes, no DB migrations. Pure engine behavior fix.

### Files touched

- `supabase/functions/execute-automation/index.ts` — ~15 lines edited across two spots (`send_sms` block, `send_whatsapp` block, outer `catch`).

After deploy I'll verify by checking the most recent automation logs for any lead that hit the Twilio "Authenticate" error and confirm later steps would now run instead of being skipped.
