
-- Add demo mode settings to workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS demo_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_variant text NOT NULL DEFAULT 'default';
