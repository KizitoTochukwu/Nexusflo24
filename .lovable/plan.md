
## Problem

The toast "Connected, but Meta didn't return your WhatsApp Business Account…" fires in `src/lib/meta/fbSdk.ts` when `FB.login()` resolves with a valid `code` but the companion `WA_EMBEDDED_SIGNUP` `FINISH` postMessage never delivered `waba_id` / `phone_number_id`. This is common when:

- The user finishes onboarding in the popup but Meta's postMessage is blocked/missed (Brave Shields, Safari ITP, popup closes a beat too early).
- The browser silently drops the cross-origin message.

We already hold a usable `code` — Meta's Graph API can derive the WABA + phone from the exchanged token, so the connect flow shouldn't dead-end here.

## Fix (frontend + backend)

### 1. `src/lib/meta/fbSdk.ts`
- When `FB.login()` returns a `code` but `wabaId` / `phoneNumberId` are empty AND no Meta `ERROR`/`CANCEL` was received, **resolve with empty `wabaId` / `phoneNumberId`** instead of rejecting. The backend will recover them.
- Keep the existing reject path for real cancel/error events.

### 2. `src/hooks/useWhatsAppConnection.ts`
- `useConnectWhatsApp` already forwards `code/wabaId/phoneNumberId`. No change needed beyond letting empty strings flow through.

### 3. `supabase/functions/whatsapp-embedded-signup/index.ts`
- Loosen validation: require only `workspaceId` + `code`; `wabaId` / `phoneNumberId` are optional.
- After exchanging the `code` for `accessToken`, if either is missing:
  - Call `GET /debug_token?input_token={accessToken}&access_token={appId}|{appSecret}` and read `data.granular_scopes` for `whatsapp_business_management` → `target_ids` → that's the WABA ID list. Pick the first.
  - Call `GET /{wabaId}/phone_numbers?fields=id,display_phone_number,verified_name` and pick the first phone → that's the `phoneNumberId`.
  - If still missing after both fallbacks, return a clear error guiding the user to retry with popups allowed.
- Continue with existing subscribe/register/persist flow using the resolved IDs.

### 4. `src/components/settings/WhatsAppConnectCard.tsx` (only if it surfaces the error string)
- No change unless it hardcodes the old message. Will verify and adjust toast wording to a friendlier "Finishing setup…" if the recovery path runs.

## Edge cases
- User has multiple WABAs in the same Business: pick the first WABA + first phone; document that the user can re-run connect to switch. (Multi-WABA selector is out of scope for this fix.)
- Token exchange returns a token with no `whatsapp_business_management` scope → return the original "complete every step" error.
- `debug_token` call failure → log and fall back to the original error so the user retries.

## Out of scope
- Meta App approval / Tech Provider setup checklist UI (already shown).
- Multi-WABA picker UI.
- Webhook signature changes.

## Validation
- Manual: click **Connect WhatsApp via Meta**, complete the popup; confirm card flips to "Custom credentials active" and templates start syncing even when the postMessage is missed.
- Edge function logs: confirm `debug_token` recovery branch runs without error when IDs were empty.
