
-- Add provider column to workspace_channel_settings for WhatsApp discrimination
ALTER TABLE public.workspace_channel_settings
  ADD COLUMN IF NOT EXISTS provider text;

-- Enforce single active WhatsApp provider per workspace.
-- Meta writes to both whatsapp_settings and (as mirror) workspace_channel_settings with provider='meta'.
-- Twilio writes only to workspace_channel_settings with provider='twilio'.
-- The trigger only deactivates the "other" provider when activating twilio-in-channel-settings
-- or meta-in-whatsapp-settings.

CREATE OR REPLACE FUNCTION public.enforce_single_whatsapp_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'whatsapp_settings' AND NEW.is_active IS TRUE THEN
    -- Activating Meta: deactivate any Twilio channel row.
    UPDATE public.workspace_channel_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id
        AND channel = 'whatsapp'
        AND provider = 'twilio'
        AND is_active = true;
  ELSIF TG_TABLE_NAME = 'workspace_channel_settings'
        AND NEW.channel = 'whatsapp'
        AND NEW.provider = 'twilio'
        AND NEW.is_active IS TRUE THEN
    -- Activating Twilio: deactivate Meta.
    UPDATE public.whatsapp_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_single_provider_meta ON public.whatsapp_settings;
CREATE TRIGGER trg_wa_single_provider_meta
  AFTER INSERT OR UPDATE OF is_active ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_whatsapp_provider();

DROP TRIGGER IF EXISTS trg_wa_single_provider_twilio ON public.workspace_channel_settings;
CREATE TRIGGER trg_wa_single_provider_twilio
  AFTER INSERT OR UPDATE OF is_active, provider ON public.workspace_channel_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_whatsapp_provider();
