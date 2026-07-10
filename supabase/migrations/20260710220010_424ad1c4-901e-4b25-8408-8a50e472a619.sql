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

    UPDATE public.workspace_channel_settings
      SET is_active = false, updated_at = now()
      WHERE workspace_id = NEW.workspace_id
        AND channel = 'whatsapp'
        AND provider = 'meta'
        AND id IS DISTINCT FROM NEW.id
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;