# Why your user never gets sales notifications

## What "Notify Sales" does today

In `supabase/functions/execute-automation/index.ts` (lines 542–551), the action does exactly **one** thing:

- Inserts a single row into the `notifications` table
- Recipient = `automation.user_id` (the person who **created** the automation)
- Type = `automation_alert`

That's it. No email, no SMS, no WhatsApp, no push. No fan-out to the assigned lead owner, no fan-out to the workspace team.

The bell icon (`useNotifications`) polls every 30s and shows it. Browser push (`usePushNotifications`) only fires when:
1. The user has clicked "Allow notifications" in the browser, AND
2. The tab is currently hidden (see `useNotificationWatcher`)

In the **workflow** runtime (`execute-workflow`), `notify_sales` isn't handled at all — workflows silently no-op it.

## So the most likely reasons your user "never gets" them

1. **Wrong recipient.** The notification goes to the automation's creator, not to the lead's `assigned_owner_id` or the team. If the creator is an admin/owner setting up flows for a sales rep, the rep never sees anything.
2. **No out-of-app channel.** If the user isn't logged in / tab not open / browser permission not granted, they'll never know a hot lead came in.
3. **Workflow path = silent.** If they built it in the new Workflow editor instead of the legacy Automation editor, the step does nothing.
4. **Only one notification per chain** — no escalation if ignored.

## Proposed fix (Notify Sales v2)

Make the action a real multi-channel sales alert. Step config gains:

- **Recipients** (multi-select, default = "Lead owner")
  - Lead owner (`leads.assigned_owner_id` → fallback `user_id`)
  - Automation creator
  - Specific workspace member(s)
  - Role: all admins / all members
- **Channels** (multi-select, default = In-app + Email)
  - In-app (current behaviour)
  - Email (via `email-send`, to each recipient's profile email)
  - SMS (via `sms-send`, to each recipient's profile phone — skipped if missing)
  - WhatsApp (via `whatsapp-send`, with 24h-window fallback rules already in place)
- **Title / Message** with `{{lead.*}}` interpolation (already supported)
- **Quiet hours** (optional, per-workspace) — defer to follow-up

Implementation outline:

```text
execute-automation / notify_sales
 ├─ Resolve recipients[] → list of {user_id, email, phone}
 ├─ For each recipient:
 │    ├─ Always: insert notifications row (in-app + bell)
 │    ├─ If channel.email & profile.email → email-send
 │    ├─ If channel.sms   & profile.phone → sms-send
 │    └─ If channel.wa    & profile.phone → whatsapp-send (skip on closed window per existing fallback rule)
 └─ Status = "completed" if ≥1 delivery succeeded, else "skipped" (chain continues either way per existing skip-criteria policy)
```

Mirror the same handler in `execute-workflow/index.ts` so workflow nodes stop being silent.

## UI changes

`src/components/automations/AutomationStepEditor.tsx` — when action = `notify_sales`, render:
- Recipients picker (chips: Lead owner / Creator / Specific user / Role)
- Channel toggles (In-app on by default and not togglable; Email/SMS/WA optional)
- Title + Message textareas with the existing `{{tokens}}` helper
- Hint line: "Email/SMS/WhatsApp use the recipient's profile contact info. Missing contacts are skipped."

Update `src/lib/automations/smartActionValidation.ts` `notifySalesDefaults` to validate the new shape.

## Backwards compatibility

Existing steps with only `{ message }`:
- Default `recipients = ["lead_owner", "creator"]`
- Default `channels = ["inapp", "email"]`
- No DB migration needed — config is JSONB.

## Quick diagnostic for the complaining user (no code change)

Before shipping the above, you can verify the cause in 2 minutes:

1. SQL: `select user_id, count(*) from notifications where type='automation_alert' and created_at > now() - interval '7 days' group by 1;` — confirms whether alerts were created and for whom.
2. Compare that `user_id` to the rep's `auth.users.id`. If they don't match, it's reason #1 above.

## Out of scope (call out, don't build now)

- Quiet hours / Do-Not-Disturb windows
- Acknowledge / escalate-after-N-minutes
- Slack / Teams webhooks
