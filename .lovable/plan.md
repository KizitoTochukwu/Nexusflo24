## Update Twilio WhatsApp credentials — both scopes

### 1. Platform-wide fallback (used when no workspace credentials are set)
Update the three Twilio runtime secrets via the secure secrets form:
- `TWILIO_ACCOUNT_SID` — Twilio Account SID (starts with `AC`, 34 chars)
- `TWILIO_AUTH_TOKEN` — 32-char Twilio Auth Token
- `TWILIO_FROM_NUMBER` — your WhatsApp-enabled sender, e.g. `whatsapp:+14155238886` (or a Messaging Service SID in `MESSAGING_SERVICE_SID`)

You enter the values in the popup; nothing is shown in chat or stored in code. These are consumed by edge functions as the fallback when a workspace has not configured its own Twilio credentials.

### 2. Per-workspace credentials (Settings → Channels → WhatsApp)
For each workspace that should use its own Twilio account:
1. Open Dashboard → Settings → Channels → WhatsApp tab.
2. Select provider = **Twilio**.
3. Enter Account SID, Auth Token, and From Number (WhatsApp-enabled).
4. Save — the `channel-settings-save` edge function validates the format, AES-GCM encrypts the config with `CHANNEL_SETTINGS_ENCRYPTION_KEY`, and upserts into `workspace_channel_settings` (channel = `whatsapp`, `is_active = true`).

No code changes are needed — the save endpoint already validates and stores Twilio WhatsApp credentials, and `resolveChannelCredentials()` already prefers workspace credentials over platform fallback.

### Order of operations
1. Switch to build mode so I can trigger the secret-update popup for the three platform secrets.
2. You enter the new Twilio values and submit.
3. You then update each workspace's WhatsApp tab in the UI (no agent action required).

### Notes
- I will not display, log, or echo any secret value.
- `TWILIO_API_KEY` is connector-managed and is not touched here.
- If you'd rather skip the platform fallback and only keep per-workspace credentials, say so and I'll only do step 2 (no agent action needed).