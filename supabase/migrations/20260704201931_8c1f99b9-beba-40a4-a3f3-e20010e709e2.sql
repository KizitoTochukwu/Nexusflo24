
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS tier_limit int NOT NULL DEFAULT 1000;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS assume_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_opt_in_at timestamptz;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS compliance_note text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS campaign_id uuid;
