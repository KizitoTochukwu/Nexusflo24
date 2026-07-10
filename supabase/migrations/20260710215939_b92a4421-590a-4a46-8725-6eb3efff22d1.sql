-- Allow provider-specific WhatsApp channel rows while preserving the existing
-- one-row-per-channel behavior for Email/SMS.

ALTER TABLE public.workspace_channel_settings
  ADD COLUMN IF NOT EXISTS provider text;

-- Replace the old global unique constraint with partial unique indexes.
ALTER TABLE public.workspace_channel_settings
  DROP CONSTRAINT IF EXISTS workspace_channel_settings_workspace_id_channel_key;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_channel_settings_workspace_channel_default_uidx
  ON public.workspace_channel_settings (workspace_id, channel)
  WHERE provider IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_channel_settings_workspace_channel_provider_uidx
  ON public.workspace_channel_settings (workspace_id, channel, provider)
  WHERE provider IS NOT NULL;

-- Normalize existing WhatsApp channel rows to a provider tag based on the
-- encrypted config/provider metadata already saved by the app when possible.
UPDATE public.workspace_channel_settings
SET provider = 'twilio'
WHERE channel = 'whatsapp'
  AND provider IS NULL;

-- Remove older trigger names/implementations so switching is deterministic.
DROP TRIGGER IF EXISTS enforce_single_whatsapp_provider_ws ON public.whatsapp_settings;
DROP TRIGGER IF EXISTS enforce_single_whatsapp_provider_wcs ON public.workspace_channel_settings;
DROP TRIGGER IF EXISTS trg_enforce_single_whatsapp_provider ON public.whatsapp_settings;
DROP TRIGGER IF EXISTS trg_enforce_single_whatsapp_provider ON public.workspace_channel_settings;
DROP TRIGGER IF EXISTS trg_wa_single_provider_meta ON public.whatsapp_settings;
DROP TRIGGER IF EXISTS trg_wa_single_provider_twilio ON public.workspace_channel_settings;
DROP TRIGGER IF EXISTS enforce_single_wa_provider_meta ON public.whatsapp_settings;
DROP TRIGGER IF EXISTS enforce_single_wa_provider_twilio ON public.workspace_channel_settings;
DROP FUNCTION IF EXISTS public.enforce_single_whatsapp_provider() CASCADE;

CREATE OR REPLACE FUNCTION public.enforce_single_wa_provider_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS TRUE THEN
    UPDATE public.workspace_channel_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id
        AND channel = 'whatsapp'
        AND provider = 'twilio'
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_wa_provider_twilio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel = 'whatsapp'
     AND NEW.provider = 'twilio'
     AND NEW.is_active IS TRUE THEN
    UPDATE public.whatsapp_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_wa_provider_meta
BEFORE INSERT OR UPDATE OF is_active ON public.whatsapp_settings
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_wa_provider_meta();

CREATE TRIGGER enforce_single_wa_provider_twilio
BEFORE INSERT OR UPDATE OF is_active, provider, channel ON public.workspace_channel_settings
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_wa_provider_twilio();