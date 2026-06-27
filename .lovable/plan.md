## Add Webhook Verify Token field to Meta WhatsApp connection card

Make the WhatsApp webhook Verify Token visible and manageable directly from the Meta Cloud API card in Settings → Channels, so you can copy/regenerate it for Meta's webhook configuration without digging into Manual Setup.

### Frontend
- **`src/components/settings/WhatsAppConnectCard.tsx`**: In the `MetaWhatsAppPanel` (the connected-state card showing Phone / WABA / Business ID), add a new **"Webhook Verify Token"** section with:
  - Read-only masked input showing `••••••••` plus a "Show" toggle once revealed.
  - **Copy** button (copies the plaintext token to clipboard).
  - **Regenerate** button (generates a fresh 32-char random token, saves it, then displays it once for copy).
  - Helper text: *"Paste this into Meta Business → WhatsApp → Configuration → Webhook → Verify token, then click Verify and Save."*
  - Display the webhook Callback URL (`https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/whatsapp-webhook`) with its own Copy button right above the token, since both are needed together in Meta.

### Backend (edge function)
- **New: `supabase/functions/whatsapp-verify-token/index.ts`** with two actions:
  - `GET` (action=`reveal`): admin-only — decrypts and returns the current `verify_token_encrypted` from `whatsapp_settings` for the caller's workspace.
  - `POST` (action=`regenerate`): admin-only — generates a new 32-char token, encrypts with `WHATSAPP_SETTINGS_ENCRYPTION_KEY`, updates `whatsapp_settings.verify_token_encrypted`, returns the new plaintext once.
  - Both validate JWT via `getClaims`, check `is_workspace_admin`, and use the service-role client for the DB write.
- **`supabase/config.toml`**: register the new function with `verify_jwt = false` (auth handled in-code, matching other WhatsApp functions).

### Webhook compatibility
- No changes to `whatsapp-webhook` — it already compares Meta's `hub.verify_token` against the decrypted stored token, so a regenerate immediately takes effect on the next Meta re-subscription.

### Out of scope
- No changes to the Manual Setup section in `ChannelSettingsTab.tsx` (kept as a fallback).
- No template syncing or webhook auto re-subscribe — that remains a manual step in Meta as described in the previous guide.
