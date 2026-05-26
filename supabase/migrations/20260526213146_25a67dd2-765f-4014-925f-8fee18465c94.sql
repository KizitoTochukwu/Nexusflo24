
ALTER TABLE public.whatsapp_settings 
  ADD COLUMN IF NOT EXISTS default_reengagement_template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_messages 
  ADD COLUMN IF NOT EXISTS auto_templated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name text;
