# Plan: Multi-Provider WhatsApp (Meta + Twilio)

Run Twilio WhatsApp alongside the existing Meta Cloud API integration. Each workspace picks one active provider in Settings. All higher-level senders (campaigns, automations, AI replies, hot-lead alerts) call a single dispatcher that routes to the chosen provider.

## 1. Data model

Add a `provider` field to the per-workspace WhatsApp config (stored in `workspace_channel_settings.config_encrypted` JSON — no schema change needed):

- `provider`: `"meta"` (default) | `"twilio"`
- Meta fields (existing): `phone_number_id`, `waba_id`, `access_token`
- Twilio fields (new): `account_sid`, `auth_token`, `from_number` (E.164, e.g. `whatsapp:+14155238886`), `messaging_service_sid` (optional)

`whatsapp_messages` table already stores provider-agnostic rows — add a `provider` text column + `provider_message_id` (nullable) so inbound webhooks and status callbacks from either provider can update the right record.

## 2. New edge functions

- `twilio-whatsapp-send` — outbound. Resolves workspace creds, posts to Twilio `/Messages.json` via the Twilio connector gateway, writes to `whatsapp_messages`, deducts credits (admin bypass), returns `{success, message_id}`. Mirrors `whatsapp-send` response shape so callers don't branch.
- `twilio-whatsapp-webhook` — inbound messages. Validates Twilio signature (`X-Twilio-Signature` + `TWILIO_AUTH_TOKEN`), upserts inbound message, fires the same lead-capture + AI reply pipeline that Meta uses.
- `twilio-whatsapp-status` — delivery/read callbacks. Updates `whatsapp_messages.delivery_status` by `provider_message_id`.

## 3. Dispatcher refactor

Introduce `supabase/functions/_shared/whatsapp-dispatch.ts` with a single `sendWhatsApp({workspaceId, to, body, template, leadId, campaignId})`:

1. Read workspace channel settings → pick `provider`.
2. If `meta` → call existing `whatsapp-send`.
3. If `twilio` → call new `twilio-whatsapp-send`.
4. Return unified `{success, reason?, fallback?}`.

Update callers to use the dispatcher: `execute-campaign`, `execute-automation`, `notify-hot-lead`, AI sales-closer reply paths. Note: Twilio WhatsApp has its own 24h window — surface the same `window_closed` signal so the fallback channel logic in `execute-campaign` still fires.

## 4. UI changes (Settings → Channels → WhatsApp)

`src/components/settings/WhatsAppConnectCard.tsx` becomes a tabbed/segmented card:

- **Provider toggle**: Meta Cloud API (Embedded Signup) | Twilio WhatsApp
- Meta tab: existing Embedded Signup button + status (unchanged).
- Twilio tab: form for Account SID, Auth Token, From Number / Messaging Service SID, plus a "Test send" button. Save via `channel-settings-save` (already validates and encrypts).
- Show the active provider badge at the top, and the inbound webhook URLs to paste into Twilio Console:
  - Inbound: `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/twilio-whatsapp-webhook`
  - Status: `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/twilio-whatsapp-status`

Only one provider is active per workspace at a time — switching toggles `is_active` and updates the `provider` field.

## 5. Twilio credentials

Twilio connector is already linked (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY` present). Per-workspace creds override platform creds via the existing `resolveChannelCredentials` flow. No new secrets required.

## 6. Webhook auth & config

Both Twilio functions need `verify_jwt = false` (public webhooks) — add to `supabase/config.toml`. Signature validation done in code using `TWILIO_AUTH_TOKEN` (workspace-resolved when phone-number-mapped, platform fallback otherwise).

## 7. Out of scope (explicitly)

- WhatsApp template approval inside Twilio (handled in Twilio Console; we just send by template SID when provided).
- Migrating existing Meta-connected workspaces — they stay on Meta unless they switch.
- Number portability between providers.

## Files touched

**New**
- `supabase/functions/twilio-whatsapp-send/index.ts`
- `supabase/functions/twilio-whatsapp-webhook/index.ts`
- `supabase/functions/twilio-whatsapp-status/index.ts`
- `supabase/functions/_shared/whatsapp-dispatch.ts`
- migration: add `provider`, `provider_message_id` to `whatsapp_messages`

**Edited**
- `src/components/settings/WhatsAppConnectCard.tsx` (provider tabs)
- `src/hooks/useWhatsAppConnection.ts` (provider state)
- `supabase/functions/execute-campaign/index.ts` (use dispatcher)
- `supabase/functions/execute-automation/index.ts` (use dispatcher)
- `supabase/functions/notify-hot-lead/index.ts` (use dispatcher)
- `supabase/functions/channel-settings-save/index.ts` (validate Twilio fields when `provider=twilio`)
- `supabase/config.toml` (verify_jwt=false for two new webhooks)

## Acceptance

- Workspace can switch between Meta and Twilio in Settings without code changes.
- A campaign send routes to the active provider and logs in `whatsapp_messages` with correct `provider`.
- Twilio inbound message creates/updates a lead and threads in the unified inbox.
- Twilio delivery status updates the message row.
- Existing Meta flows are unchanged for workspaces that haven't switched.
