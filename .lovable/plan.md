## Current state

NexusFlo24 does **not** currently support SendGrid. The email stack is hard-wired to **Resend**:

- `supabase/functions/email-send/index.ts` only implements `sendResend()` and calls the Resend REST API directly.
- Platform fallback uses the `RESEND_API_KEY` secret + `EMAIL_FROM`.
- Per-workspace credentials live in `workspace_channel_settings` (channel = `email`, encrypted JSON of `{ provider, api_key, from_email, from_name }`).
- The UI in **Dashboard → Settings → Channels** (`src/components/settings/ChannelSettingsTab.tsx`) saves with `provider: "resend"` hard-coded and exposes only API Key / From Email / From Name fields. No provider picker, no Reply-To field.
- `auth-email-hook` and the queue worker (`process-email-queue`) use the platform-managed Lovable Emails (Mailgun under the hood) — independent of this provider switch.

So today there is no place to paste an `SG.xxxxx` key.

## Plan — add SendGrid safely without breaking Resend

### 1. Backend: extend `email-send` to support both providers

In `supabase/functions/email-send/index.ts`:
- Add `sendSendgrid(apiKey, fromEmail, fromName, to, subject, html, replyTo)` calling `POST https://api.sendgrid.com/v3/mail/send` with header `Authorization: Bearer <SG key>` and JSON body `{ personalizations, from, reply_to, subject, content }`. Return `{ messageId }` from the `X-Message-Id` response header.
- Read `creds.config.provider` (default `"resend"` when missing — preserves current behaviour for every existing workspace).
- Dispatch: `provider === "sendgrid"` → `sendSendgrid(...)`, else → `sendResend(...)`.
- Platform fallback in `resolveChannelCredentials(...)` extended to also surface `SENDGRID_API_KEY` if set, with provider auto-detected (Resend preferred when both exist, to keep current behaviour).
- Update the "credential failure" meta and `email_logs` rows to record which provider was used.

### 2. Backend: allow provider + reply_to in saved settings

- `supabase/functions/channel-settings-get/index.ts` already returns `provider` and `from_email`/`from_name` as non-secret. Add `reply_to` to the non-secret list for email.
- `channel-settings-save` already merges arbitrary JSON, so no schema change needed — it will persist `{ provider, api_key, from_email, from_name, reply_to }` as-is.
- `email-send` will prefer `creds.config.reply_to` over the hard-coded `support@nexusflo24.com` default.

### 3. Frontend: provider picker in Settings → Channels → Email

In `src/components/settings/ChannelSettingsTab.tsx` (email card around line 893):
- Add a `Select` for **Provider** with options `Resend` and `SendGrid (Twilio)`.
- Add a **Reply-To** input.
- Rename API key helper text to show the expected key format per provider (`re_xxx` vs `SG.xxx`).
- On save, send `{ provider, api_key, from_email, from_name, reply_to }` instead of the hard-coded `provider: "resend"`.
- Load existing `provider` / `reply_to` values from `channels?.email` on mount so the form rehydrates after refresh (consistent with the recent persistence fix).

### 4. Optional platform-wide SendGrid secret

If the user wants SendGrid as the *default platform* fallback (not just per-workspace), add a `SENDGRID_API_KEY` secret via the secrets tool. Not required for per-workspace SendGrid use — a workspace key alone is enough.

### 5. Deploy & verify

- Deploy `email-send` and `channel-settings-get`.
- From **Settings → Channels → Email**: pick **SendGrid**, paste `SG.xxxxx`, set From Email (must be a SendGrid-verified sender or domain), From Name `NexusFlo24`, Reply-To `support@nexusflo24.com`, save.
- Send a test email from the editor. Confirm row in `email_logs` with `status = sent` and a SendGrid `provider_message_id`.

## Where to enter the values (after this ships)

**Dashboard → Settings → Channels → Email card**
- Provider: **SendGrid (Twilio)**
- API Key: `SG.xxxxx`
- From Email: your SendGrid-verified sender (e.g. `noreply@nexusflo24.com`)
- From Name: `NexusFlo24`
- Reply-To: `support@nexusflo24.com`

No other email flow (auth emails, transactional queue) is touched — they continue to use the existing Lovable Emails pipeline.

## Risk / compatibility

- Existing workspaces have no `provider` field stored → defaults to `"resend"` → zero behaviour change.
- Resend code path is left untouched.
- No DB migration required (config is encrypted JSON blob).