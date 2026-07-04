# Fix WhatsApp test send (the same pattern HubSpot / GHL / Wati use)

## Why the current fix isn't working

Meta returns `132001 — Template name does not exist in the translation` for `reengagement_followup_v1` under `en`, `en_US`, and `en_GB`. That means the synced DB row is stale — the template no longer exists (or was renamed / re-approved under a different WABA) on the phone number our token is calling. The retry loop cycles languages but can't recover a template that isn't there.

Separately, coupling a **test send** to the workspace's re-engagement template is wrong. Test sends exist to verify credentials, not template state. HubSpot, GoHighLevel, Wati, and ManyChat all handle this the same way:

1. Fetch approved templates **live** from Meta's Graph API right before sending (never trust the local cache blindly).
2. For **connectivity tests**, fall back to Meta's universal `hello_world` template so the test always succeeds when credentials are valid.
3. Reserve the "24h window closed + no template" hard failure for real automation/campaign sends only.

## Changes

### 1. `supabase/functions/whatsapp-send/index.ts`

**a. Live template resolver (`resolveLiveTemplate`)** — new helper.
When we're about to send a template, first call `GET https://graph.facebook.com/v19.0/{waba_id}/message_templates?name={name}&fields=name,language,status,components` using the workspace access token, filter to `status=APPROVED`, and pick the exact match. If the local `language` doesn't match any live variant, use the first approved language returned. If nothing approved comes back, return `null` — do NOT attempt the doomed send.

WABA ID resolution order:
- `whatsapp_settings.waba_id` (already stored during sync).
- If missing, resolve via `GET /v19.0/{phone_number_id}?fields=whatsapp_business_account_id` and cache back to `whatsapp_settings.waba_id`.

**b. Update `whatsapp_templates` cache on every live lookup** — when live data differs from stored (`language`, `status`, `components`), upsert the fresh copy so the marketplace UI stays in sync. Self-healing, matches how HubSpot/GHL keep template state fresh.

**c. Replace the current language-cycle retry loop (lines 472–527)** with the live resolver — it's strictly better and covers not just language mismatch but also renames, deletions, and status changes.

**d. Test-send fallback to `hello_world`** — when `body.preview === true` AND (window closed OR the default template resolves to `null`), send Meta's universal `hello_world` (language `en_US`) instead of failing. Return `{ success: true, waMessageId, testMode: "hello_world", note: "Test delivered via hello_world (credentials verified)." }`. This is the exact pattern used by HubSpot's "Send test message" and GHL's "Test WhatsApp" buttons.

  - Do NOT use `hello_world` for real campaign/automation sends (`preview !== true`) — that path keeps the current strict `fallback:true` behavior so callers switch to SMS/Email.
  - `hello_world` sends still skip credits (already the case for `preview`).

**e. When resolver returns `null` for a non-preview send** — return the existing structured `{ success:false, fallback:true, reason:"template_unavailable", error }` payload so campaigns/automations can gracefully fall back.

### 2. `supabase/functions/whatsapp-sync-templates/index.ts`

Also persist `waba_id` on `whatsapp_settings` when we discover it during sync (so the live resolver has it cached). No schema change — column already exists per the current settings row shape; if missing we'll add it in the migration below.

### 3. Migration (only if `waba_id` column is missing on `whatsapp_settings`)

```sql
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS waba_id text;
```

No new grants/policies needed — `whatsapp_settings` already has them.

### 4. `src/components/automations/email-editor/AutomationEmailEditor.tsx`

Extend the current 132001 friendly-error branch:

- If response body includes `testMode === "hello_world"` → toast: *"Test sent via Meta's hello_world template (credentials verified). Your actual message content will send in real automations."*
- If `reason === "template_unavailable"` → toast: *"WhatsApp template no longer exists on Meta. Sync templates in Settings → Channels → WhatsApp and pick a new default."*
- Keep existing generic 132001 message as final fallback.

## Out of scope (unchanged)

- Twilio branch, credit accounting, sender resolver, 24h window detection logic, `whatsapp_messages` schema, Preview button behavior for other channels.
- No changes to database RLS/GRANTs beyond the optional `waba_id` column add.

## Verification

1. Deploy `whatsapp-send` (+ `whatsapp-sync-templates` if migration ran).
2. From the automation editor, click "Send test" to `07517327597` → expect toast "Test delivered via hello_world (credentials verified)" and a delivered WhatsApp message on the device.
3. Check `whatsapp_messages` — the new row logs `status='sent'`, `template_name='hello_world'`, `auto_templated=true`.
4. Trigger an actual campaign send to a closed-window lead → expect the live-resolved workspace template (or clean `fallback:true` if none approved).
