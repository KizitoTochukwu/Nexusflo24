
## Goal

Stop showing "Twilio WhatsApp is the active provider" / "Disconnect Twilio" just because the user clicked the Twilio tab while Meta is actually connected. Selecting a tab must not change what is active — only a successful save/switch does.

## Files to change

- `src/components/settings/WhatsAppConnectCard.tsx` — provider-tab logic + panels
- `supabase/functions/channel-settings-save/index.ts` — deactivate Meta when Twilio activated
- `supabase/functions/whatsapp-embedded-signup/index.ts` — deactivate Twilio row when Meta connected (verify path & apply)
- New migration — DB trigger enforcing single active WhatsApp provider per workspace

## 1. State split (`WhatsAppConnectCard.tsx`)

Lift state into the parent `WhatsAppConnectCard`:

```text
selectedProviderTab: "meta" | "twilio"        // pure UI, from Tabs value
activeProvider:      "meta" | "twilio" | null // derived from DB
```

`activeProvider` derivation (single source of truth):

- `"meta"` when `whatsapp_settings.is_active === true` and `phone_number_id` exists
- `"twilio"` when `workspace_channel_settings` row `channel='whatsapp'`, `is_active=true`, config `provider='twilio'`
- otherwise `null`

Compute via a new hook `useActiveWhatsAppProvider(workspaceId)` that reads both sources through the existing `useWhatsAppConnection` + `channel-settings-get` fetch, and exposes `{ activeProvider, refresh }`. Header badge (line 627) reads only `activeProvider === 'meta' ? 'Meta Connected' : activeProvider === 'twilio' ? 'Twilio Connected' : 'Not connected'`.

Default `selectedProviderTab` = current `activeProvider` on first load, else `"meta"`. Tab clicks only call `setSelectedProviderTab`.

## 2. Panel behaviour

Pass `activeProvider` into both panels.

### `MetaWhatsAppPanel` (Meta tab selected)

- `activeProvider === "meta"` → current UI (connected details + Sync + Disconnect).
- `activeProvider === "twilio"` → show alert **"Twilio WhatsApp is currently active for this workspace."** Hide the standard "Connect WhatsApp via Meta" button and instead show **"Connect & Switch to Meta"** — same `handleConnect`, but on success also calls the twilio-deactivation code path (server does it, see §3) and refreshes `activeProvider`.
- `activeProvider === null` → current "Connect WhatsApp via Meta" flow.

### `TwilioWhatsAppPanel` (Twilio tab selected)

- `activeProvider === "twilio"` → keep active-alert + "Disconnect Twilio".
- `activeProvider === "meta"` → show alert **"Meta Cloud API is currently active for this workspace."** Always render the Twilio credential fields. Primary button label becomes **"Validate & Switch to Twilio"**. Do NOT render the "Twilio is active" alert or the "Disconnect Twilio" button in this state.
- `activeProvider === null` → current "Save & activate Twilio" flow, no active alert, no disconnect.

Remove the local `isActive` state — replace with the derived `activeProvider === 'twilio'`.

### Client-side Twilio validation before save

- `account_sid` must match `/^AC[0-9a-fA-F]{32}$/`
- `auth_token` must be non-empty (32 hex is already enforced server-side)
- `from_number` must match E.164 `/^\+[1-9]\d{6,14}$/` (skip when `messaging_service_sid` is set)

Toast the exact failing field before calling `channel-settings-save`.

### Switch confirmation

When `activeProvider` differs from the provider being activated, open an `AlertDialog`: "Switching will deactivate <other> for this workspace. Continue?" Only after confirm → call the save/connect → on success call `refresh()` from the hook → then render success toast. No state flips before the DB refresh returns the new active provider.

## 3. Server: enforce single active provider

### `channel-settings-save` (channel === 'whatsapp', provider twilio, non-disconnect)

After the successful upsert, run:

```sql
UPDATE public.whatsapp_settings
SET is_active = false, updated_at = now()
WHERE workspace_id = $1 AND is_active = true;
```

### `whatsapp-embedded-signup` on successful Meta connect

After marking `whatsapp_settings.is_active = true`, delete the twilio row:

```sql
DELETE FROM public.workspace_channel_settings
WHERE workspace_id = $1 AND channel = 'whatsapp';
```

Templates and webhook tokens (`whatsapp_templates`, verify-token row) are untouched — only provider activation rows change.

### Migration — atomic guard

New migration adds a trigger so any direct write cannot leave two active:

```sql
CREATE OR REPLACE FUNCTION public.enforce_single_whatsapp_provider()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'whatsapp_settings' AND NEW.is_active THEN
    UPDATE public.workspace_channel_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id AND channel = 'whatsapp' AND is_active = true;
  ELSIF TG_TABLE_NAME = 'workspace_channel_settings'
        AND NEW.channel = 'whatsapp' AND NEW.is_active THEN
    UPDATE public.whatsapp_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id AND is_active = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_wa_single_provider_meta
  BEFORE INSERT OR UPDATE OF is_active ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_whatsapp_provider();

CREATE TRIGGER trg_wa_single_provider_twilio
  BEFORE INSERT OR UPDATE OF is_active ON public.workspace_channel_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_whatsapp_provider();
```

Both fire in the same transaction as the activating write, so the "two active" state can never be observed.

## 4. Post-activation refresh

Both panels, on save/connect success:

1. `await refresh()` — re-reads `whatsapp_settings` and `channel-settings-get`.
2. Derive new `activeProvider` from the refreshed data.
3. Show success toast using the refreshed value (e.g. "Twilio WhatsApp is now active"). If refresh reports the other provider is still active, show error instead — never optimistically flip UI.

## Out of scope (explicitly preserved)

- Meta connection data, `whatsapp_templates`, `whatsapp-webhook`, verify-token section.
- Twilio inbound/status webhook URL panels.
- Existing edge functions for send/receive on either provider.
