ALTER TABLE public.workspace_branding
  ADD COLUMN IF NOT EXISTS email_template_settings jsonb;