
-- =============================================
-- PHASE 4: Database Migration
-- =============================================

-- 1. Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'clicked',
  reward_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Service can manage referrals" ON public.referrals
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can insert referrals" ON public.referrals
  FOR INSERT TO public
  WITH CHECK (true);

-- 2. Workspace invites table
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workspace invites" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view workspace invites" ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage invites" ON public.workspace_invites
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Email logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  from_email text,
  subject text,
  body text,
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage email_logs" ON public.email_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Add direction column to sms_logs
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound';

-- 5. Workspace activity table
CREATE TABLE public.workspace_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace activity" ON public.workspace_activity
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace activity" ON public.workspace_activity
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage workspace_activity" ON public.workspace_activity
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. Enable realtime on email_logs and sms_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
