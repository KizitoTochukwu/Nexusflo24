
-- Create whatsapp_settings table
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  verify_token_encrypted text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_settings_workspace ON public.whatsapp_settings(workspace_id);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view whatsapp_settings"
  ON public.whatsapp_settings FOR SELECT
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert whatsapp_settings"
  ON public.whatsapp_settings FOR INSERT
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update whatsapp_settings"
  ON public.whatsapp_settings FOR UPDATE
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete whatsapp_settings"
  ON public.whatsapp_settings FOR DELETE
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  wa_message_id text,
  direction text NOT NULL DEFAULT 'outbound',
  phone_number text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  body text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_workspace ON public.whatsapp_messages(workspace_id);
CREATE INDEX idx_whatsapp_messages_wa_id ON public.whatsapp_messages(wa_message_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view whatsapp_messages"
  ON public.whatsapp_messages FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));
