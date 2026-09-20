ALTER TABLE public.voice_settings
  ADD COLUMN IF NOT EXISTS max_numbers integer NOT NULL DEFAULT 1;