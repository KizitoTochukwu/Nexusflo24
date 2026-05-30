
-- WhatsApp embedded signup + template sync schema

ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS display_phone_number text,
  ADD COLUMN IF NOT EXISTS verified_name text,
  ADD COLUMN IF NOT EXISTS business_account_name text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS connection_method text NOT NULL DEFAULT 'manual';

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS components jsonb,
  ADD COLUMN IF NOT EXISTS meta_template_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Realtime publication for live inbox
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages';
  END IF;
END $$;

-- Make sure whatsapp_messages has REPLICA IDENTITY FULL so realtime UPDATEs include old row
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
