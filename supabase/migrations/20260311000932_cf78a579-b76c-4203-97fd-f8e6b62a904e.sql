
CREATE TABLE public.workspace_channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  config_encrypted text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, channel)
);

ALTER TABLE public.workspace_channel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view channel settings"
  ON public.workspace_channel_settings FOR SELECT
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert channel settings"
  ON public.workspace_channel_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update channel settings"
  ON public.workspace_channel_settings FOR UPDATE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete channel settings"
  ON public.workspace_channel_settings FOR DELETE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));
