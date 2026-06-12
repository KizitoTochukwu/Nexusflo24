ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE INDEX IF NOT EXISTS whatsapp_messages_provider_message_id_idx
  ON public.whatsapp_messages (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;