
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,
  from_email text,
  from_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view email_settings"
  ON public.email_settings FOR SELECT
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert email_settings"
  ON public.email_settings FOR INSERT
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update email_settings"
  ON public.email_settings FOR UPDATE
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete email_settings"
  ON public.email_settings FOR DELETE
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
