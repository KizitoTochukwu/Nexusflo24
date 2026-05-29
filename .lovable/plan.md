# WhatsApp Integration — HubSpot-style wiring

Goal: any workspace can click **Connect WhatsApp**, complete Meta's Embedded Signup, and immediately send/receive messages with their approved templates synced automatically — exactly like HubSpot, Wati, ManyChat.

## What's already in place
- `whatsapp_settings` (per-workspace phone_number_id + encrypted access_token + default re-engagement template)
- `whatsapp_templates` (manual entry today)
- `whatsapp_messages` (inbound + outbound log, with `auto_templated` / `template_name`)
- `whatsapp-send` edge function with credentials resolver, credit deduction, auto-template-on-window-closed logic (already drafted)
- `whatsapp-webhook` edge function (inbound + status callbacks)
- `whatsapp-save-settings` edge function (manual paste flow)
- Settings → Channels tab with manual phone-id/token form + templates marketplace

## What's missing / broken
1. No one-click Meta connect — users must manually create a Meta app, get a Phone Number ID + permanent token, paste them. >90% drop-off.
2. Templates are typed by hand — they drift from what Meta actually approved.
3. Re-engagement auto-template path is coded but never verified end-to-end.
4. No proof inbound webhook + statuses surface in the dashboard inbox in real time.
5. Workspaces have no visible "connection health" — token expiry, WABA ID, display name, business verification status are all hidden.

## Plan

### 1. Meta Embedded Signup (one-click connect)
**Frontend** (`ChannelSettingsTab.tsx` → new `WhatsAppConnectCard`):
- Load Facebook JS SDK (`https://connect.facebook.net/en_US/sdk.js`) on demand.
- "Connect WhatsApp" button calls `FB.login(...)` with `config_id=<META_EMBEDDED_SIGNUP_CONFIG_ID>`, `response_type='code'`, scope `whatsapp_business_management,whatsapp_business_messaging,business_management`.
- On success, capture the short-lived `code` + the WABA/phone payload returned via `FB.AppEvents` / `message` event listener.
- POST `{ code, waba_id, phone_number_id }` to new edge function `whatsapp-embedded-signup`.

**New edge function `whatsapp-embedded-signup`**:
- Exchange `code` → access token via `GET /v21.0/oauth/access_token` using `META_APP_ID` + `META_APP_SECRET`.
- Call `POST /v21.0/{waba_id}/subscribed_apps` to subscribe our app to the WABA (required for inbound webhooks).
- Call `POST /v21.0/{phone_number_id}/register` with a PIN to register the phone with Cloud API.
- Encrypt token, upsert `whatsapp_settings` (workspace_id, phone_number_id, access_token_encrypted, waba_id, display_phone_number, verified_name, is_active=true).
- Trigger initial template sync (call internal `whatsapp-sync-templates`).

**Schema additions** to `whatsapp_settings`:
- `waba_id text`, `display_phone_number text`, `verified_name text`, `business_account_name text`, `token_expires_at timestamptz null`, `connection_method text default 'manual'` ('manual' | 'embedded_signup').

**Required new secrets** (will request via `add_secret`):
- `META_APP_ID` (public — also exposed as `VITE_META_APP_ID` for FB.init)
- `META_APP_SECRET` (server-only, for code exchange)
- `META_EMBEDDED_SIGNUP_CONFIG_ID` (public — also `VITE_META_EMBEDDED_SIGNUP_CONFIG_ID`)

User must, in Meta App dashboard: add "WhatsApp" product, set up "Embedded Signup" configuration, whitelist callback domain `nexusflo24.com` + `*.lovable.app`. We'll provide a short setup doc in-app.

Manual paste form stays as a fallback ("Advanced: connect with your own token").

### 2. Auto-sync approved templates from Meta
**New edge function `whatsapp-sync-templates`**:
- Input: `{ workspace_id }`.
- Reads `waba_id` + decrypted access_token from `whatsapp_settings`.
- Fetches `GET /v21.0/{waba_id}/message_templates?limit=100` (paginated).
- For each template, upsert into `whatsapp_templates` on `(workspace_id, name, language)` with `status` (APPROVED/PENDING/REJECTED → lowercased), `category`, `body_preview` (extracted from BODY component), `variable_count` (count of `{{n}}` in body), and a new `components jsonb` column storing the full Meta component array so `whatsapp-send` can build the exact `components` payload with header/body/button params.
- Mark templates that exist locally but no longer in Meta as `status='deleted'`.

**Schema addition** to `whatsapp_templates`: `components jsonb`, `meta_template_id text`, `last_synced_at timestamptz`.

**UI** — `WhatsAppTemplatesTab`:
- Replace "Add template" with "Sync from Meta" button (manual add still available but secondary).
- Show status badge (approved/pending/rejected) pulled from Meta.
- Auto-trigger sync on connect, plus a 1×/day cron via `process-scheduled-jobs`.

### 3. Finalize re-engagement fallback (end-to-end)
- `whatsapp-send` already auto-falls-back to `default_reengagement_template_id`. Two remaining issues:
  - For templates with variables, currently injects raw `msgBody` as `{{1}}`. Confirm length cap (1024) + escape newlines (Meta rejects `\n` in body params for some categories).
  - When `effectiveTemplate.components` exists in the synced template, pass them through unchanged instead of rebuilding (handles HEADER + BUTTON params correctly).
- Add settings UI: if no `default_reengagement_template_id` is set but at least one approved UTILITY/MARKETING template exists, prompt the user to pick one with a yellow banner ("Pick a default template so messages outside the 24h window still deliver").

### 4. Inbound webhook + 2-way inbox verification
- `whatsapp-webhook` already writes inbound rows. Audit it for:
  - Handles `messages`, `statuses` (sent/delivered/read/failed), and updates matching `whatsapp_messages.status` by `wa_message_id`.
  - Sets `lead_id` by matching `phone_number` (E.164) against `leads.phone`; creates a lead if none.
- Realtime: enable `ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages` (if not already) so `DashboardMessages` updates live.
- `DashboardMessages` WhatsApp tab: confirm it subscribes to the channel and renders inbound + outbound threaded by `phone_number`.

### 5. Connection health card
Small card on Channels tab showing: connected number, verified business name, WABA ID, token age, "Test send to my number" button, "Disconnect" button (revokes `subscribed_apps`, nulls `is_active`).

---

## Files / deliverables

**New edge functions**
- `supabase/functions/whatsapp-embedded-signup/index.ts`
- `supabase/functions/whatsapp-sync-templates/index.ts`
- `supabase/functions/whatsapp-disconnect/index.ts`

**Edited edge functions**
- `whatsapp-send`: use synced `components` for templates; tighten variable escaping.
- `whatsapp-webhook`: audit + add status mapping + lead auto-link (if missing).

**Schema (single migration)**
- `whatsapp_settings`: add `waba_id`, `display_phone_number`, `verified_name`, `business_account_name`, `token_expires_at`, `connection_method`.
- `whatsapp_templates`: add `components jsonb`, `meta_template_id text`, `last_synced_at timestamptz`; allow `status='deleted'`.
- Add `whatsapp_messages` to `supabase_realtime` publication (idempotent).

**Frontend**
- `src/components/settings/WhatsAppConnectCard.tsx` (new) — embedded signup button + connection health.
- `src/components/settings/ChannelSettingsTab.tsx` — mount the new card above the manual form, demote manual to "Advanced".
- `src/components/settings/WhatsAppTemplatesTab.tsx` — "Sync from Meta" button, status badges.
- `src/hooks/useWhatsAppConnection.ts` (new) — wraps connect / disconnect / sync / health query.
- `src/lib/meta/fbSdk.ts` (new) — lazy-load FB JS SDK, `FB.init`, `FB.login` promise wrapper.

**Cron**
- `process-scheduled-jobs` enqueues a daily `whatsapp-sync-templates` per active workspace.

**Secrets to add** (will prompt user after plan approval):
- `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`

**Setup prereq the user must do once in Meta dashboard** (we'll surface this as an in-app doc/link):
- Create / pick a Meta App → add WhatsApp + Facebook Login for Business products.
- Configure an Embedded Signup "config" → copy the Config ID.
- Add `https://nexusflo24.com` and `https://id-preview--*.lovable.app` to Valid OAuth Redirect URIs.
- Submit for Advanced Access on `whatsapp_business_management` + `whatsapp_business_messaging` (required to go live; dev mode works for testing with whitelisted users).

## Out of scope (flag for later)
- Template **creation** from inside NexusFlo24 (we sync existing, not author new ones).
- Multi-number per workspace (one phone_number_id per workspace for now).
- Tech Provider / Solution Partner billing pass-through (we just connect, Meta bills the user's WABA).
