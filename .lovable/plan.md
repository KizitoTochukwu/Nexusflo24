

## Plan: Platform-Managed Integrations Access Control

### Context

NexusFlo24 already has a working admin role system: `user_roles` table, `app_role` enum (`admin`), `admin_allowlist` seeded with `kizzyadichie@gmail.com`, `sync_admin_role()` function, `useIsAdmin()` hook, and `AdminGuard` component. Per security rules, roles must stay in the separate `user_roles` table — not on `profiles`.

The user's `super_admin` maps to the existing `admin` role. No schema changes needed for role management.

### Changes

#### 1. Frontend: Split Settings Tabs by Role

**DashboardSettings.tsx** — Major restructure:

- Import `useIsAdmin()` hook
- **For admins**: show all tabs including "Integrations" (Email/WA/SMS + Webhooks)
- **For customers**: hide "Integrations" tab entirely, show a new "Webhooks" tab instead
- If customer navigates to `?tab=integrations`, show "Access Denied" card
- Extract Webhook Settings Card into its own `WebhooksTab` component (reused by both views)

Tab layout:
```
Customer: Profile | Billing | Webhooks | Automation | Notifications | Security
Admin:    Profile | Billing | Integrations | Webhooks | Automation | Notifications | Security
```

#### 2. Move Provider Credentials to Platform ENV Secrets

Currently Email/SMS/WhatsApp credentials are stored per-workspace in DB tables (`email_settings`, `sms_settings`, `whatsapp_settings`). The new model reads credentials from platform ENV variables.

**New secrets to add** (via `add_secret` tool):
- `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `support@nexusflo24.com`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`

#### 3. Update Edge Functions for Platform Credentials

**`email-send/index.ts`**: Read `RESEND_API_KEY` and `EMAIL_FROM` from ENV instead of decrypting from `email_settings` table. Remove workspace-specific credential lookup.

**`sms-send/index.ts`**: Read `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` from ENV. Remove workspace credential lookup.

**`whatsapp-send/index.ts`**: Read `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` from ENV. Remove workspace credential decryption.

**`email-save-settings/index.ts`**, **`sms-save-settings/index.ts`**, **`whatsapp-save-settings/index.ts`**: Add admin role check at the top. These endpoints now only update platform-level config (accessible only to super_admin). Alternatively, since credentials move to ENV, these save-settings functions become admin-only status/config endpoints or can be deprecated.

#### 4. Backend Admin Authorization

All save-settings and test-send edge functions must verify admin role:
```typescript
// Check admin role via user_roles table
const { data: adminRole } = await adminClient
  .from("user_roles")
  .select("role")
  .eq("user_id", userId)
  .eq("role", "admin")
  .maybeSingle();
if (!adminRole) {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}
```

Send functions (`email-send`, `sms-send`, `whatsapp-send`) remain accessible to workspace members since automations/campaigns invoke them on behalf of users.

#### 5. Admin Integrations Status Widget

Add a read-only status card at the top of the admin Integrations tab:
- Resend: configured / not configured (checks if `RESEND_API_KEY` is set)
- Twilio: configured / not configured
- WhatsApp: configured / not configured

Create a small edge function `integration-status` that returns boolean flags (no secret values).

#### 6. Webhooks Tab (Customer-Accessible)

Extract the existing Webhook Settings card from `IntegrationsTab` into a standalone `WebhooksTab` component showing:
- Lead Ingest Endpoint URL (copy button)
- Bearer token instructions
- X-Workspace-Id header guidance

This tab is workspace-scoped and visible to all authenticated users.

### Files to Create/Edit

- **Edit**: `src/pages/dashboard/DashboardSettings.tsx` — split tabs, role-gate Integrations, add WebhooksTab
- **Edit**: `supabase/functions/email-send/index.ts` — use ENV credentials
- **Edit**: `supabase/functions/sms-send/index.ts` — use ENV credentials  
- **Edit**: `supabase/functions/whatsapp-send/index.ts` — use ENV credentials
- **Edit**: `supabase/functions/email-save-settings/index.ts` — add admin check
- **Edit**: `supabase/functions/sms-save-settings/index.ts` — add admin check
- **Edit**: `supabase/functions/whatsapp-save-settings/index.ts` — add admin check
- **New**: `supabase/functions/integration-status/index.ts` — returns config status booleans
- **New secrets**: `RESEND_API_KEY`, `EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`

### Execution Order

1. Request all new ENV secrets (batch)
2. Create `integration-status` edge function
3. Update send functions to use ENV credentials
4. Update save-settings functions with admin checks
5. Restructure `DashboardSettings.tsx` with role-gated tabs

