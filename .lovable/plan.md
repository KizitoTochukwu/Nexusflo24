

## Plan: Bring-Your-Own Sender — Per-Workspace Channel Settings

### Overview
Enable each customer to connect their own Email domain (Resend), SMS credentials (Twilio), and WhatsApp Business number. Platform ENV credentials remain as the fallback when a workspace has no custom config.

### 1. Database: New `workspace_channel_settings` Table

Single table storing per-workspace, per-channel encrypted credentials:

```text
workspace_channel_settings
├── id (uuid, PK)
├── workspace_id (uuid, NOT NULL)
├── channel (text: 'email' | 'sms' | 'whatsapp')
├── is_active (boolean, default true)
├── config_encrypted (text) — JSON blob encrypted with a platform key
├── created_at, updated_at
└── UNIQUE(workspace_id, channel)
```

RLS: workspace admins can CRUD their own rows. The `config_encrypted` field stores a JSON object with channel-specific fields:

- **Email**: `{ provider, api_key, from_email, from_name }`
- **SMS**: `{ account_sid, auth_token, from_number }`
- **WhatsApp**: `{ access_token, phone_number_id, verify_token }`

Encryption/decryption happens in edge functions using `CHANNEL_SETTINGS_ENCRYPTION_KEY` (new secret).

### 2. Frontend: New "Channels" Tab in Settings

Available to **all workspace admins** (not just platform admins). Replaces the need for customers to contact the platform admin.

Three collapsible cards — Email, SMS, WhatsApp — each with:
- Credential input fields (password-masked)
- Save / Test / Disconnect buttons
- Status indicator (connected / not connected / using platform default)

The admin-only "Integrations" tab stays for platform-level status. The new "Channels" tab is workspace-scoped.

### 3. Edge Functions: Save & Retrieve Channel Settings

**New: `channel-settings-save/index.ts`**
- Accepts `{ workspaceId, channel, config }`, encrypts config, upserts into `workspace_channel_settings`
- Validates workspace membership, workspace admin role

**New: `channel-settings-get/index.ts`**
- Returns channel status (configured/not) per workspace — does NOT return decrypted secrets to the client
- Returns masked values (e.g., `sk_...****`) for UX

### 4. Update Send Functions: Workspace Credentials → Platform Fallback

Each send function (`email-send`, `sms-send`, `whatsapp-send`) gains a credential resolution step:

```text
1. Query workspace_channel_settings for (workspace_id, channel)
2. If found & is_active → decrypt & use workspace credentials
3. If not found → fall back to platform ENV credentials
4. If neither → return "not configured" error
```

Same pattern applied in `execute-automation` and `execute-campaign` (these call the send functions via HTTP, so they inherit the behavior automatically).

### 5. New Secret

- `CHANNEL_SETTINGS_ENCRYPTION_KEY` — AES-256 key for encrypting workspace credentials at rest

### Files to Create/Edit

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `src/components/settings/ChannelSettingsTab.tsx` | UI for per-workspace channel config |
| **Create** | `supabase/functions/channel-settings-save/index.ts` | Encrypt & upsert credentials |
| **Create** | `supabase/functions/channel-settings-get/index.ts` | Return masked status |
| **Edit** | `src/pages/dashboard/DashboardSettings.tsx` | Add "Channels" tab |
| **Edit** | `supabase/functions/email-send/index.ts` | Workspace credential lookup before ENV fallback |
| **Edit** | `supabase/functions/sms-send/index.ts` | Same pattern |
| **Edit** | `supabase/functions/whatsapp-send/index.ts` | Same pattern |
| **Migration** | New table `workspace_channel_settings` with RLS | |
| **Secret** | `CHANNEL_SETTINGS_ENCRYPTION_KEY` | |

### Execution Order

1. Request `CHANNEL_SETTINGS_ENCRYPTION_KEY` secret
2. Create `workspace_channel_settings` table with RLS
3. Create `channel-settings-save` and `channel-settings-get` edge functions
4. Build `ChannelSettingsTab` component
5. Add "Channels" tab to `DashboardSettings.tsx`
6. Update `email-send`, `sms-send`, `whatsapp-send` to resolve workspace credentials first

