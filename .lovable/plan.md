## Problem

On the Channel Settings page (Email/SMS/WhatsApp), after saving credentials and reloading, the input fields (From Email, From Name, From Number, etc.) appear empty. Only the small "masked" preview at the top reflects what was saved. Re-saving requires re-typing the secret because the form treats empty as "no value".

Root cause: `channel-settings-get` only returns masked values; the form's local state is initialized to `""` and never hydrated. Saving an empty `api_key` would overwrite the stored secret, so the UI keeps secrets blank — but it also leaves the non-secret fields blank.

## Fix

1. **`supabase/functions/channel-settings-get/index.ts`**
   - Alongside `masked`, return a `non_secret` object containing only safe fields per channel:
     - email: `from_email`, `from_name`, `provider`
     - sms: `from_number`, `account_sid` (last 4 visible already via mask — return full for prefill convenience? keep masked; only `from_number` here)
     - whatsapp: `phone_number_id`, `verify_token` is secret → exclude
   - Keep secret fields (`api_key`, `auth_token`, `access_token`) out of `non_secret`.

2. **`src/components/settings/ChannelSettingsTab.tsx`**
   - In `fetchStatus`, after `setChannels(data)`, hydrate field state from `data.email.non_secret`, `data.sms.non_secret`, `data.whatsapp.non_secret`.
   - Show a helper hint under each secret input when `configured` is true: "Saved — leave blank to keep current key" and remove the `!emailApiKey` (and equivalents) from `disabled` when channel is already configured so the user can re-save without re-entering the secret.

3. **`supabase/functions/channel-settings-save/index.ts`**
   - When a config field is empty/missing and a previous encrypted config exists, merge: decrypt the existing config and keep prior values for any blank secret fields. This prevents accidentally wiping the stored API key when the user saves after only changing From Name.
   - Apply to: email `api_key`, sms `auth_token`, whatsapp `access_token`/`verify_token`.

4. Redeploy both edge functions.

## Result

After reload, From Email / From Name / From Number / Phone Number ID stay populated. Secret inputs remain empty (security best practice) but the small masked preview shows the stored value, and the user can save edits without re-typing the secret.
