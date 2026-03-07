
-- Google Calendar token storage
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL DEFAULT now(),
  calendar_id text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view google_calendar_tokens"
  ON public.google_calendar_tokens FOR SELECT
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert google_calendar_tokens"
  ON public.google_calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update google_calendar_tokens"
  ON public.google_calendar_tokens FOR UPDATE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete google_calendar_tokens"
  ON public.google_calendar_tokens FOR DELETE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- Add google_token_id FK to booking_pages
ALTER TABLE public.booking_pages
  ADD COLUMN google_token_id uuid REFERENCES public.google_calendar_tokens(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER set_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
