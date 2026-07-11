ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS twilio_content_sid text,
  ADD COLUMN IF NOT EXISTS twilio_variable_sample jsonb;

ALTER TABLE public.whatsapp_templates
  DROP CONSTRAINT IF EXISTS whatsapp_templates_provider_check;
ALTER TABLE public.whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_provider_check
  CHECK (provider IN ('meta','twilio','both'));

ALTER TABLE public.whatsapp_templates
  DROP CONSTRAINT IF EXISTS whatsapp_templates_twilio_sid_shape;
ALTER TABLE public.whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_twilio_sid_shape
  CHECK (twilio_content_sid IS NULL OR twilio_content_sid ~ '^HX[0-9a-fA-F]{32}$');

CREATE INDEX IF NOT EXISTS whatsapp_templates_twilio_sid_idx
  ON public.whatsapp_templates (workspace_id, twilio_content_sid)
  WHERE twilio_content_sid IS NOT NULL;