
-- Add trigger_config and fallback_settings columns to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS trigger_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS campaign_mode text NOT NULL DEFAULT 'broadcast';
