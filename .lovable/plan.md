# WhatsApp Delivery Truth: Real Meta Status Lifecycle

## Root cause (verified in code)

`supabase/functions/whatsapp-send/index.ts` inserts the outbound row with `status: "sent"` immediately after Meta returns HTTP 200, and sets `campaign_messages.delivery_status = "delivered"` in the same breath. The UI then reports success from the API response alone. So "Delivered" is inferred from a Graph API acknowledgement, not from a Meta status callback.

Supporting facts confirmed:
- `whatsapp_webhook` already verifies `X-Hub-Signature-256`, handles `entry[].changes[].value.statuses[]`, and has a rank-based no-regression guard — that part is broadly sound but has no per-event log and no dedupe table.
- `whatsapp_messages` has `wa_message_id`, `provider_message_id`, `delivered_at`, `read_at`, `failed_at` — but no unique constraint on the wamid, no `submitted_at`/`sent_at`, no structured error fields, no `waba_id`/`phone_number_id`/automation linkage.
- There is no status-event table, no webhook-event table, and no provider health surface.

## What will be built

### 1. Database (additive migration)
- `whatsapp_messages`: add `submitted_at`, `sent_at`, `waba_id`, `sender_phone_number_id`, `language_code`, `automation_id`, `automation_run_id`, `error_code`, `error_title`, `error_details`, `fbtrace_id`, `last_status_at`. Add a partial unique index on `wa_message_id` for outbound rows.
- New `whatsapp_status_events` (append-only): message link, wamid, status, meta timestamp, raw error fields, unique on (wamid, status, meta timestamp) so duplicate callbacks are no-ops.
- New `whatsapp_webhook_events`: raw redacted payload, signature validity, phone_number_id, resolved workspace, unique event key for idempotency.
- New `whatsapp_provider_health`: per-workspace last sent/delivered/failed/webhook timestamps, subscription facts, template sync time, last known errors — only written from verified evidence.
- RLS: workspace members read their own rows; writes only via service role; platform staff read-all via existing `is_platform_staff`. GRANTs alongside every new table.

### 2. Send path (`whatsapp-send`)
- Keep E.164 normalization; reject invalid numbers before any credit action.
- Validate template name, language, approval status and variable count against the synced template before calling Meta; block on missing/paused/rejected/disabled/mismatched-language/bad-variable cases with an explicit error.
- Resolve and record the WABA ID and the exact `phone_number_id` used, plus whether the sender is workspace-owned or platform-owned; return that in the response.
- Insert the row with `status: "submitted"` (never `sent`/`delivered`), store the Meta wamid, timestamps and context.
- Stop writing `campaign_messages.delivery_status = "delivered"` on submission — only the webhook may set delivered/read.
- Credits: hold/charge only after Meta accepts the message; refund or skip deduction for pre-acceptance rejections. Charging keyed on the wamid so retries can't double-charge.

### 3. Webhook (`whatsapp-webhook`)
- Log every POST into `whatsapp_webhook_events` with tokens/secrets and message bodies redacted, then return 200 immediately and finish processing in the background.
- Write each status into `whatsapp_status_events` (idempotent), then project the highest-ranked status onto `whatsapp_messages`.
- `read` implies delivered (sets `delivered_at` if absent). No regression: read → delivered/sent and delivered → sent are ignored.
- On `failed`, persist code, title, message, `error_data.details` and `fbtrace_id`.
- Update `whatsapp_provider_health` timestamps from real callbacks only.

### 4. Status model in the app
`queued → submitted → sent → delivered → read`, or `... → failed`.
If no callback arrives within a threshold (default 15 minutes), the UI shows **Awaiting confirmation / status unknown** — never auto-promoted to delivered.

### 5. Test-message flow
Replace the one-shot toast in Settings → Channels (and the platform Settings test card) with a live progress timeline: Queued → Submitted to Meta → Sent → Delivered → Read / Failed, subscribed to the message row in realtime. Immediately after the API call it reads "Submitted to Meta — awaiting delivery confirmation." It shows which sender/WABA was used before sending, the wamid, per-stage timestamps, redacted provider response and Meta's real failure text.

### 6. Provider health page
New Platform Admin page `WhatsApp Provider Health` (plus a compact workspace card): token configured yes/no (never the value), token type/expiry when known, WABA ID, phone-number ID, display number, registration state, app-subscribed-to-WABA and `messages` field subscription (read live from Graph), callback verification status, last webhook / sent / delivered / failed callbacks, template sync time, API version, actionable errors. Anything unproven renders as "Unknown — not verified".

### 7. Logs, metrics, alerts
Searchable delivery log (workspace, channel, status, template, automation, date, recipient) with counters for submitted/sent/delivered/read/failed/pending/unknown, plus alerts for webhook silence, rising failure rate, invalid/expired token, disconnected number and rejected templates.

### 8. Verification
Unit tests for the status state machine, idempotency and template validation; then a live test to a real opted-in number, following the genuine Meta lifecycle end to end.

## Notes
- Existing NexusFlo24 navy/gold design system and current integrations are preserved; Twilio WhatsApp paths are left as-is except for the shared status vocabulary.
- All Meta credentials and webhook processing stay server-side.
- Migration is additive; no existing column or table is dropped.
