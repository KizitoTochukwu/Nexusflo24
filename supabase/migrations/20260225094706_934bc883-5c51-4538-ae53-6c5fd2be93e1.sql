
-- Add price_id column to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS price_id text;
