
-- Phase 2: indexes + uniqueness constraints
CREATE UNIQUE INDEX IF NOT EXISTS credit_pricing_rules_channel_country_uniq
  ON public.credit_pricing_rules (channel, COALESCE(country, ''));

CREATE INDEX IF NOT EXISTS communication_usage_workspace_created_idx
  ON public.communication_usage (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS communication_usage_channel_created_idx
  ON public.communication_usage (channel, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS sender_profiles_default_per_channel_uniq
  ON public.sender_profiles (workspace_id, channel)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS sender_profiles_workspace_channel_status_idx
  ON public.sender_profiles (workspace_id, channel, status);
