## Goal

Make the "Connect WhatsApp via Meta" button complete onboarding cleanly using Embedded Signup Config ID `945252895216570`, eliminate the `Error validating verification code` failure, and store the resulting account against the current workspace in both `whatsapp_accounts` (new) and `sender_profiles` (existing).

## Root cause of the current "Error validating verification code"

Today both the frontend `FB.login(...)` call and the backend token exchange send `redirect_uri = https://nexusflo24.com/` (hardcoded in `supabase/functions/_shared/meta.ts`). Meta requires byte-for-byte equality between the value used at popup time and the value used at code exchange — AND it must match what's registered against the Embedded Signup configuration. When using `FB.login` with a `config_id`, the cleanest fix is to **omit `redirect_uri` entirely**. Meta then uses the configuration's own redirect, and the backend exchanges the code without a `redirect_uri` parameter, which removes the class of byte-mismatch errors.

## Plan

### 1. Pin the configuration ID

- Make `945252895216570` the default Embedded Signup configuration used by the frontend, with `META_EMBEDDED_SIGNUP_CONFIG_ID` still overriding when set.
- Update `supabase/functions/whatsapp-embedded-config/index.ts` to return `configId: Deno.env.get("META_EMBEDDED_SIGNUP_CONFIG_ID") || "945252895216570"` and `configured: Boolean(appId)` (config ID is now always present).

### 2. Remove the broken redirect_uri flow

- `supabase/functions/_shared/meta.ts`: delete `META_REDIRECT_URI` (or export it as `""`) — it is the source of the mismatch.
- `src/lib/meta/fbSdk.ts`:
  - Stop importing/forwarding `META_REDIRECT_URI`.
  - In `launchEmbeddedSignup`, call `FB.login` with only `config_id`, `response_type: "code"`, `override_default_response_type: true`, and `extras: { setup: {}, featureType: "whatsapp_business_app_onboarding" }`. No `redirect_uri`.
  - Log: `[Meta Embedded Signup] using config_id`, the `window.location.href`, and the final `authResponse.code` length.
- `src/hooks/useWhatsAppConnection.ts`:
  - Drop the redirect-uri preflight check and the `redirectUri` field in the POST body.
  - Add console logs at OAuth start, after `FB.login` resolves (code/waba/phone), and on error.
- `supabase/functions/whatsapp-embedded-signup/index.ts`:
  - Drop the `redirectUri` body field and the `redirect_uri` form param on the `/oauth/access_token` call (Meta accepts code exchange without it when the original auth used `config_id`).
  - Keep current Graph calls for `/debug_token`, `/{waba}/phone_numbers`, `/{phone}` lookups.
  - Log: incoming `workspaceId`, code length, resolved `waba_id`, `phone_number_id`, `display_phone_number`, `verified_name`, `business_name`, and any Graph error verbatim.
  - Return a `redirectUriUsed: null` field in the response for transparency.

### 3. New persistence table `whatsapp_accounts`

Create via migration (separate review step):

- Columns: `id uuid pk`, `workspace_id uuid → workspaces` (unique), `waba_id text`, `phone_number_id text unique`, `display_phone_number text`, `verified_name text`, `business_name text`, `verification_status text`, `connection_method text default 'embedded_signup'`, `connected_by uuid → auth.users`, `connected_at timestamptz default now()`, `created_at`, `updated_at`.
- GRANT `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`.
- RLS: workspace members can `SELECT`; only workspace admins (`is_workspace_admin`) can `INSERT/UPDATE/DELETE`; edge function uses service role so it bypasses RLS.
- Trigger: `update_updated_at_column` on update.

Continue writing to `whatsapp_settings` (encrypted token, verify token, default template) and `workspace_channel_settings` so existing send/receive paths keep working. The new `whatsapp_accounts` row is the canonical workspace record requested by the user.

### 4. Upsert `sender_profiles`

In `whatsapp-embedded-signup` after successful Meta lookup:
- Upsert one `sender_profiles` row per workspace with `channel = 'whatsapp'`, `label = verified_name || display_phone_number`, `display_name = verified_name`, `address = display_phone_number`, `status = 'active'`, `is_default = true` (clear other defaults for the workspace's WhatsApp channel).
- Upsert matching `whatsapp_senders` row (`sender_profile_id`, `phone_number_id`, `waba_id`, `display_phone_number`, `verified_name`).

### 5. Frontend success UX

- `WhatsAppConnectCard` already invalidates the connection query on success. Add a `toast.success("WhatsApp connected — <verified_name> (<display_phone_number>)")` using the values returned from the edge function.
- On error, show the verbatim Meta message in the toast and console.

### 6. Verification

After build:
1. Open Settings → Channels → WhatsApp, click **Connect WhatsApp via Meta**.
2. Confirm console shows: `using config_id 945252895216570`, code received, backend `redirect_uri` log absent, `waba_id` + `phone_number_id` logged.
3. Confirm rows appear in `whatsapp_accounts`, `sender_profiles` (+ `whatsapp_senders`), `whatsapp_settings`, `workspace_channel_settings` for the current workspace.
4. Confirm card flips to **Connected** with the verified name + phone number, and a success toast appears.

## What I need from you before I implement

Two yes/no confirmations:

1. **OK to drop `redirect_uri` from both the FB.login call and the backend code exchange?** This is the change that actually fixes the "verification code" error when using `config_id` based Embedded Signup. If you instead want to keep a redirect URI, you'd need to register the exact string in Meta App → Embedded Signup configuration `945252895216570` and tell me which value (e.g. `https://nexusflo24.com/`).

2. **OK to add the new `whatsapp_accounts` table** (separate migration), or do you want me to reuse `whatsapp_settings` only? Your spec explicitly named `whatsapp_accounts`, so default is yes.
