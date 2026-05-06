## Diagnosis — the automation IS firing

I traced both new leads through the database:

- **kizzyadichie@outlook.com** (Newsletter, 18:09:23) → enrolled in `Testing` automation at 18:09:24
- **kizitotochukwu52@gmail.com** (Webinar, 18:03:40) → enrolled at 18:03:43

Both were correctly picked up by the `new_lead` trigger of automation `baabbe12-…` (Testing). The chain has been advancing on schedule:

```text
Lead 7d34… : step 0 → 2 (delay, completed) → 3,4 → 5 (delay, pending @ 18:20)
Lead e72d… : step 0 → 2 (completed) → 5 (completed) → 10 (delay, pending @ 18:20)
```

So the trigger fired and the engine is doing its job. **Three real problems are blocking the actual messages from being sent.**

## Root causes

### 1. Resend API key is invalid (blocks every email)
Edge logs show:
```text
email-send Resend error: API key is invalid
```
Step 0 of the Testing automation is `send_email`. It fails immediately for every lead. The chain still advances (delay queues), but no email is ever delivered.

### 2. Step #3 of the Testing automation is empty
```text
step_order: 3, step_type: action, config: {}
```
This logs `Unknown action type: undefined` and produces a noisy `action:skipped` event. It should be deleted or configured.

### 3. The newsletter signup lead has no phone number
`send_whatsapp` and `send_sms` steps throw `Lead has no phone`. The newsletter form only collects email, but the automation tries WhatsApp + SMS. Without a "skip if missing channel" fallback, every non-email step errors out.

### 4. Cosmetic: WhatsApp 24h-window error logged loudly
For the lead that did have a phone, WhatsApp returned `24h window closed`. That's correct provider behavior, but it's logged as an `error` rather than a graceful `skipped`.

## Fix plan

### A. Make it obvious the email channel is broken
- Add a one-time check in `execute-automation` that, if `send_email` fails with `API key is invalid` or `Unauthorized`, writes a workspace-level notification: *"Email sending is paused — your Resend API key is invalid. Fix it in Settings → Channels → Email."*
- Also surface this in the **Sequence Health panel** (already exists from the previous fix) as a red banner at the top of the automation drawer.

### B. Show the user how to fix the Resend key
- Open the channel-settings tab focused on Email when the user clicks the banner.
- The user must paste a valid `RESEND_API_KEY` in **Settings → Channels → Email** (or update the workspace-level Resend key if they're using a personal one).

### C. Auto-skip channel steps when the lead lacks the contact info
In `execute-automation/index.ts`:
- For `send_sms` / `send_whatsapp`: if `!lead.phone`, mark the step as `skipped` (with reason `"Lead has no phone — channel skipped"`) instead of `error`. Do **not** kill the chain.
- For `send_email`: if `!lead.email`, same treatment.
- Add a per-step `automation_logs` event `action:channel_unavailable` so the UI can show a yellow "skipped — missing contact info" instead of a red error.

### D. Treat WhatsApp 24h-window as a soft skip
- When `whatsapp-send` returns `success:false` + `fallback:true` (24h window), log `action:wa_window_closed` with status `skipped` and a hint "Send an approved template or wait for reply". Don't error.
- This already aligns with the core memory rule.

### E. Repair the broken step #3 in the Testing automation
- One-shot: write a small admin tool note in the **Sequence Health panel** that flags any step with `step_type='action'` and empty `config.action` as **"Configure this step"** with a one-click open-in-editor link.
- No automatic fix — the user has to choose what action this step should perform.

### F. Show empty-channel coverage upfront in the builder
- In `AutomationStepEditor.tsx`: when the user picks `send_sms` or `send_whatsapp`, show an inline warning if the trigger source (e.g. newsletter form) doesn't typically capture phone numbers: *"Most leads from this trigger may not have a phone — consider adding a Condition: phone_known before this step."*

## Files to touch

- `supabase/functions/execute-automation/index.ts` — soft-skip missing-channel steps; detect invalid-key emails; emit clearer log events
- `supabase/functions/whatsapp-send/index.ts` — confirm 24h-window response shape (already correct per memory)
- `src/components/automations/SequenceHealthPanel.tsx` — add red banner for "channel broken" + yellow chip for "skipped missing-contact"
- `src/components/automations/AutomationStepEditor.tsx` — empty-step + missing-channel warnings
- `src/components/automations/AutomationDetailsDrawer.tsx` — small surface for the broken-step quick-jump

## Verification steps

After the fix:
1. Check the Health panel for automation `baabbe12-…` → confirm red banner about Resend key + yellow chip on step 3 (empty action).
2. Re-trigger the Testing automation for `kizzyadichie@outlook.com`. Expected log chain: `send_email:error (api_key) → delay:scheduled → on resume: send_whatsapp:channel_unavailable (no phone) → empty step warning → send_sms:channel_unavailable → add_tag:success → update_status:success → ...`
3. After the user fixes the Resend key, re-trigger and confirm `send_email:success` + email arrives.

## Out of scope for this fix
- Replacing Resend with a different provider — the user can already configure a different key in Channels → Email.
- Auto-rewriting the automation step #3 — too risky, user must decide.
