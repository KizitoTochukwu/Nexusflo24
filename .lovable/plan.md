

## Plan: Wire Email Provider Integration to Backend

### Problem
The Email Provider card in Settings > Integrations only saves locally with a placeholder toast ("saved locally. Backend integration coming soon."). There is no database table, no edge function, and no actual persistence — unlike WhatsApp and SMS which are fully wired.

### Changes

#### 1. Database Migration: Create `email_settings` table
Following the same pattern as `sms_settings` and `whatsapp_settings`:

```sql
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,            -- sendgrid, mailgun, resend, smtp
  api_key_encrypted text NOT NULL,
  from_email text,                   -- e.g. hello@yourdomain.com
  from_name text,                    -- e.g. NexusFlo24
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
-- RLS: workspace members can read, workspace admins can write (enforced in edge function via service role)
```

Also add `EMAIL_SETTINGS_ENCRYPTION_KEY` secret for AES-GCM encryption of the API key.

#### 2. Edge Function: `email-save-settings`
- Authenticate user via JWT
- Validate workspace admin role
- Encrypt API key with PBKDF2 + AES-GCM (same pattern as SMS/WhatsApp)
- Validate credentials by making a lightweight API call to the selected provider (e.g., Resend `GET /api-keys`, SendGrid `GET /v3/user/profile`)
- Deactivate old settings, insert new row

#### 3. Edge Function: `email-send`
- Authenticate user, verify workspace membership
- Decrypt API key from `email_settings`
- Route to the correct provider SDK (Resend, SendGrid, Mailgun, or SMTP)
- Send email and log result

#### 4. Frontend: Wire `IntegrationsTab` Email Provider card
- Add state for `emailConnected`, `emailLoading`, `emailSaving`, `fromEmail`, `fromName`
- Fetch existing `email_settings` on mount (same pattern as SMS/WhatsApp)
- Replace `handleSaveIntegration("Email")` with real save via `supabase.functions.invoke("email-save-settings")`
- Add connected status badge (matching WhatsApp/SMS pattern)
- Add "From Email" and "From Name" fields
- Add "Send Test Email" section when connected
- Add test email functionality via `email-send` edge function

#### 5. Config Updates
- Add `email-save-settings` and `email-send` to `supabase/config.toml` with `verify_jwt = false` (auth handled in function)
- Request `EMAIL_SETTINGS_ENCRYPTION_KEY` secret

### Technical Details

The encryption pattern mirrors WhatsApp/SMS exactly:
- PBKDF2 key derivation with salt `"nexusflo24-email"`
- AES-GCM encryption with random 12-byte IV
- Base64-encoded IV+ciphertext stored in DB

Provider validation on save:
- **Resend**: `GET https://api.resend.com/api-keys` with `Authorization: Bearer {key}`
- **SendGrid**: `GET https://api.sendgrid.com/v3/user/profile` with `Authorization: Bearer {key}`
- **Mailgun**: `GET https://api.mailgun.net/v3/domains` with basic auth
- **SMTP**: Skip validation (user responsible)

### Files to Create/Edit
- **New**: `supabase/migrations/...email_settings.sql`
- **New**: `supabase/functions/email-save-settings/index.ts`
- **New**: `supabase/functions/email-send/index.ts`
- **Edit**: `supabase/config.toml` (add function entries)
- **Edit**: `src/pages/dashboard/DashboardSettings.tsx` (wire Email Provider card)

