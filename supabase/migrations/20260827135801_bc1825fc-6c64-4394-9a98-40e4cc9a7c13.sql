ALTER TABLE public.whatsapp_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.whatsapp_provider_health ADD COLUMN IF NOT EXISTS last_read_callback_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_webhook_events_event_key_uidx ON public.whatsapp_webhook_events (event_key);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_status_events_unique_idx ON public.whatsapp_status_events (wamid, status, meta_timestamp);