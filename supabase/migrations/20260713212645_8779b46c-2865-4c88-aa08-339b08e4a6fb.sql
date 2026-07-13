
ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS notify_guest_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_host_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_template_id uuid NULL REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_variables jsonb NULL;
