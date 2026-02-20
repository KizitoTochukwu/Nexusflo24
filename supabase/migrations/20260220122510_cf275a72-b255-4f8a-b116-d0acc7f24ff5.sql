
-- ============================================================
-- CAMPAIGNS MODULE: tables + RLS
-- ============================================================

-- 1) campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'email',
  objective text NOT NULL DEFAULT 'broadcast',
  status text NOT NULL DEFAULT 'draft',
  audience_filter jsonb DEFAULT '{}'::jsonb,
  message_content jsonb DEFAULT '{}'::jsonb,
  scheduled_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  open_rate real NOT NULL DEFAULT 0,
  click_rate real NOT NULL DEFAULT 0,
  conversion_rate real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_workspace_created ON public.campaigns(workspace_id, created_at DESC);
CREATE INDEX idx_campaigns_workspace_status ON public.campaigns(workspace_id, status);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace campaigns"
  ON public.campaigns FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace campaigns"
  ON public.campaigns FOR UPDATE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace campaigns"
  ON public.campaigns FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- Auto-update updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) campaign_messages table
CREATE TABLE public.campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email',
  delivery_status text NOT NULL DEFAULT 'pending',
  opened boolean NOT NULL DEFAULT false,
  clicked boolean NOT NULL DEFAULT false,
  replied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_workspace ON public.campaign_messages(workspace_id);

ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace campaign messages"
  ON public.campaign_messages FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace campaign messages"
  ON public.campaign_messages FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace campaign messages"
  ON public.campaign_messages FOR UPDATE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace campaign messages"
  ON public.campaign_messages FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
