## Root cause

When the user switched the email provider from Resend → SendGrid and saved, `channel-settings-save` ran its "preserve prior secret if the new value is blank" merge. If the SendGrid API Key field was blank on save (or even if pasted, the prior key still lingered in encrypted config under the same `api_key` slot for the previous provider), the stored `api_key` could remain the old **Resend** key. `email-send` then dispatches by the new `provider: "sendgrid"` value but sends the old `re_...` key to SendGrid, which returns **401 "API key is invalid"** — exactly the toast shown.

The same trap exists in reverse (SendGrid → Resend keeping an `SG.*` key).

## Fix

1. **`supabase/functions/channel-settings-save/index.ts`**
   - For `channel === "email"`: when the incoming `provider` differs from the previously stored `provider`, do NOT carry the prior `api_key` over. Require a fresh key for the new provider; return a clear 400 if blank: *"Enter the {SendGrid|Resend} API key for the new provider."*
   - Add lightweight format validation when an api_key is present:
     - `resend` → must start with `re_`
     - `sendgrid` → must start with `SG.`
     Reject with a precise message instead of letting the provider 401 later.

2. **`supabase/functions/email-send/index.ts`**
   - Defensive sanity check before calling the provider: if `provider === "sendgrid"` and `apiKey` does not start with `SG.` (or `resend` and not `re_`), short-circuit with a clear error logged into `email_logs` so the user sees *"Stored API key doesn't match selected provider — re-enter SendGrid key."* instead of a generic 401.

3. **`src/components/settings/ChannelSettingsTab.tsx`**
   - On the email card, when the user changes the Provider select away from the currently saved provider, clear the masked-key placeholder and show inline helper: *"Provider changed — paste a new {provider} API key to save."* Also disable the Save button until a non-empty `emailApiKey` is entered in that case.

No DB migration. Backwards compatible: existing single-provider rows keep working untouched.

## Verification

- Switch provider Resend → SendGrid, leave key blank → Save now blocks with clear message (frontend + backend).
- Paste valid `SG.xxx` key, Save → Test email sends successfully.
- Switch back to Resend without entering a key → blocked with same clear message.
