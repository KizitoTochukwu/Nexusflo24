# NexusFlo24 Delivery Audit — Findings and Repair Plan

I queried the live backend (last 30 days plus all-time totals) across email, SMS, WhatsApp, automations and workflows. Below is what is confirmed working, what is confirmed broken, and the fixes I propose.

## Status summary

| Area | Verdict | Evidence from live data |
|---|---|---|
| Email sending | Working | `email_logs`: 377 sent, latest 16 Aug. 41 failures, none newer than 21 Jul |
| Email analytics logging | Broken | `email_send_log` (the table dashboards/reporting read) holds only 8 rows, newest 4 Jul, while 418 real sends exist in `email_logs` |
| SMS sending | Partly working / mostly failing | `sms_logs`: 48 sent (latest 15 Jul), 80 failed. Dominant errors: "Message cannot be sent with the current combination of 'To' and 'From'" (UK/NG destinations sent from US +1 numbers), "Invalid 'To' Phone Number", plus older "Authenticate" credential failures |
| WhatsApp sending | Broken | `whatsapp_messages`: 9 failed in last 30 days, 0 sent. Errors: "WhatsApp template no longer exists (or isn't approved) on Meta" and "[OAuthException 131008] Required parameter is missing" |
| WhatsApp templates | Stale | All 9 rows in `whatsapp_templates` last synced 15 Jul; Meta now rejects them |
| Automations (legacy engine) | Working | `automation_logs` last 30 days: 31 success, 19 scheduled, 198 skipped, 2 errors (both the WhatsApp 131008 error) |
| Workflows (new engine) | Unproven | 0 active workflows and 0 rows ever in `workflow_runs` — the engine has never executed in production |
| Scheduled jobs | Healthy | 6 pending jobs, all correctly dated for September; the every-minute processor is booting normally |
| Channel config | Email active, SMS active, WhatsApp = Meta active (Twilio inactive) | `workspace_channel_settings` |

## Root causes

1. **WhatsApp — the blocker.** The workspace runs Meta Cloud API. Every outbound attempt fails for one of two reasons: the stored template list is two months stale so the template name sent to Meta no longer resolves, and template sends are missing required body/variable parameters (131008). Free-text sends outside the 24-hour window correctly fall back to a template, but the fallback template is also stale, so the fallback fails too.
2. **SMS — sender/destination mismatch.** Sends pick a `From` number without regard for the destination country, so UK (+44) and NG (+234) recipients are attempted from US long codes, which Twilio rejects. Some destination numbers are also malformed (`+234751732…`, a UK mobile with a Nigerian prefix), meaning normalisation runs before the country is known.
3. **Email analytics — dual logging.** Sends are recorded in `email_logs` but the reporting path expects `email_send_log` with a `message_id` per email, so dashboards under-report to near zero.
4. **Workflows engine — no coverage.** Nothing has ever run through it; the legacy automations engine is carrying all traffic.

## Repair plan

### Phase 1 — WhatsApp (highest impact)
- Re-run template sync against Meta and store the returned component structure (header/body/button variable counts), not just the name, so the send path can build a valid payload.
- Harden `whatsapp-send`: validate that every required variable slot has a value before calling Meta, and return a specific error naming the missing slot instead of the raw 131008.
- Auto-invalidate templates Meta no longer returns during sync so they disappear from the picker rather than failing at send time.
- Add a "Test template send" action in Settings → Channels → WhatsApp that surfaces the exact Meta error code and payload sent.

### Phase 2 — SMS deliverability
- Add destination-country-aware sender selection: match the `From` number's country to the recipient's country, then fall back to an alphanumeric sender ID or messaging service where the country allows it.
- Validate and normalise recipient numbers against the lead's country before send, and reject clearly invalid numbers with a readable message rather than sending them to Twilio.
- Surface Twilio's error code and a plain-English explanation in the UI, matching what was already done for WhatsApp.

### Phase 3 — Email reporting truth
- Write every send to `email_send_log` with a stable `message_id` (pending → sent/failed), keeping `email_logs` as-is for backwards compatibility.
- Backfill `email_send_log` from `email_logs` so historical reporting is not empty.

### Phase 4 — Workflows engine verification
- Run an end-to-end test enrolment through `enroll-workflow-leads` → `execute-workflow` and confirm rows land in `workflow_runs`, then report which node types execute correctly and which do not.

### Phase 5 — Ongoing visibility
- Add a Delivery Health panel (admin-only) showing sent/failed counts per channel for the last 24h/7d/30d, with the most recent error per channel, so this audit does not need to be re-run manually.

## Technical notes
- Files in scope: `supabase/functions/whatsapp-send`, `whatsapp-sync-templates`, `meta-send`, `sms-send`, `email-send`, `_shared/channel-credentials.ts`, `_shared/usage-logger.ts`, plus the channel settings UI and a new delivery-health page.
- Schema changes: add component/variable metadata and a `sync_state` column to `whatsapp_templates`; no destructive migrations.
- No provider credentials are changed by this plan; if the Meta template library is genuinely empty on Meta's side, templates must be re-submitted for approval in Meta Business Manager before Phase 1 can complete.
