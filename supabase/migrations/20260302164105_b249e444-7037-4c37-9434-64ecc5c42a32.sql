
-- SMS Settings table
CREATE TABLE public.sms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'twilio',
  account_sid text,
  auth_token_encrypted text NOT NULL,
  from_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_settings_workspace ON public.sms_settings(workspace_id);
CREATE UNIQUE INDEX idx_sms_settings_workspace_provider ON public.sms_settings(workspace_id, provider) WHERE is_active = true;

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

-- Only workspace admin/owner can read sms_settings
CREATE POLICY "Workspace admins can view sms_settings"
ON public.sms_settings FOR SELECT
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert sms_settings"
ON public.sms_settings FOR INSERT
TO authenticated
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update sms_settings"
ON public.sms_settings FOR UPDATE
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete sms_settings"
ON public.sms_settings FOR DELETE
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_sms_settings_updated_at
BEFORE UPDATE ON public.sms_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- SMS Logs table
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  to_number text NOT NULL,
  from_number text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_workspace ON public.sms_logs(workspace_id);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- sms_logs readable by workspace members
CREATE POLICY "Members can view workspace sms_logs"
ON public.sms_logs FOR SELECT
TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

-- sms_logs inserts only via service role (no authenticated insert policy)
-- Service role bypasses RLS
