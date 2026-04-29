-- Meta (Instagram + Facebook) channel settings per workspace
CREATE TABLE public.meta_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  fb_user_id text,
  fb_user_name text,
  page_id text,
  page_name text,
  ig_user_id text,
  ig_username text,
  page_access_token_encrypted text,
  verify_token_encrypted text,
  app_id text,
  app_secret_encrypted text,
  token_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  connection_method text NOT NULL DEFAULT 'manual', -- 'manual' or 'oauth'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_settings_page_id ON public.meta_settings(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX idx_meta_settings_ig_user_id ON public.meta_settings(ig_user_id) WHERE ig_user_id IS NOT NULL;

ALTER TABLE public.meta_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view meta_settings"
  ON public.meta_settings FOR SELECT TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert meta_settings"
  ON public.meta_settings FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update meta_settings"
  ON public.meta_settings FOR UPDATE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete meta_settings"
  ON public.meta_settings FOR DELETE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Service can manage meta_settings"
  ON public.meta_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_meta_settings_updated_at
  BEFORE UPDATE ON public.meta_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Social messages log (Instagram comments/DMs + Facebook comments/Messenger DMs)
CREATE TABLE public.social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid,
  platform text NOT NULL, -- 'instagram' | 'facebook'
  channel_type text NOT NULL, -- 'comment' | 'dm'
  direction text NOT NULL, -- 'inbound' | 'outbound'
  external_id text,        -- meta message id / comment id
  parent_comment_id text,  -- for private replies to comments
  post_id text,            -- the post the comment was on
  sender_id text,          -- meta user id / IGSID
  sender_username text,
  body text,
  status text NOT NULL DEFAULT 'received',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_messages_workspace ON public.social_messages(workspace_id, created_at DESC);
CREATE INDEX idx_social_messages_lead ON public.social_messages(lead_id);
CREATE INDEX idx_social_messages_external_id ON public.social_messages(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_social_messages_parent_comment ON public.social_messages(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace social_messages"
  ON public.social_messages FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage social_messages"
  ON public.social_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Keyword triggers (per workspace, attached to an automation)
CREATE TABLE public.social_keyword_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  automation_id uuid NOT NULL,
  platform text NOT NULL, -- 'instagram' | 'facebook'
  trigger_source text NOT NULL, -- 'comment' | 'dm'
  keyword text NOT NULL,
  match_mode text NOT NULL DEFAULT 'contains', -- 'contains' | 'exact' | 'starts_with'
  post_id text, -- null = any post
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_kw_lookup ON public.social_keyword_triggers(workspace_id, platform, trigger_source, is_active);

ALTER TABLE public.social_keyword_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace social_keyword_triggers"
  ON public.social_keyword_triggers FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can manage workspace social_keyword_triggers"
  ON public.social_keyword_triggers FOR ALL TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage social_keyword_triggers"
  ON public.social_keyword_triggers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_social_keyword_triggers_updated_at
  BEFORE UPDATE ON public.social_keyword_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add social_handles to leads for IG/FB user IDs
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS social_handles jsonb DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_leads_social_handles_ig ON public.leads ((social_handles->>'ig_user_id')) WHERE social_handles ? 'ig_user_id';
CREATE INDEX IF NOT EXISTS idx_leads_social_handles_fb ON public.leads ((social_handles->>'fb_user_id')) WHERE social_handles ? 'fb_user_id';