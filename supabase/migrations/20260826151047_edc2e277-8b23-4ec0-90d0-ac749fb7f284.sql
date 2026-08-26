-- ============ Platform staff roles & permissions ============
CREATE TYPE public.platform_role AS ENUM (
  'super_admin','operations_admin','billing_admin','support_agent',
  'content_admin','compliance_admin','technical_admin','analyst'
);

CREATE TABLE public.platform_permissions (
  key text PRIMARY KEY,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_permissions TO authenticated;
GRANT ALL ON public.platform_permissions TO service_role;
ALTER TABLE public.platform_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_role_permissions (
  role public.platform_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.platform_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.platform_role_permissions TO authenticated;
GRANT ALL ON public.platform_role_permissions TO service_role;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.platform_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, role)
);
CREATE INDEX idx_platform_staff_user ON public.platform_staff_assignments(user_id) WHERE is_active;
GRANT SELECT ON public.platform_staff_assignments TO authenticated;
GRANT ALL ON public.platform_staff_assignments TO service_role;
ALTER TABLE public.platform_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_staff_assignments
    WHERE user_id = _user_id AND is_active
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_platform_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_staff_assignments a
    JOIN public.platform_role_permissions rp ON rp.role = a.role
    WHERE a.user_id = _user_id AND a.is_active AND rp.permission_key = _key
  ) OR EXISTS (
    SELECT 1 FROM public.platform_staff_assignments
    WHERE user_id = _user_id AND is_active AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_platform_permissions()
RETURNS TABLE(permission_key text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT rp.permission_key
  FROM public.platform_staff_assignments a
  JOIN public.platform_role_permissions rp ON rp.role = a.role
  WHERE a.user_id = auth.uid() AND a.is_active;
$$;

CREATE POLICY "Staff can read permissions" ON public.platform_permissions
  FOR SELECT TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Staff can read role permissions" ON public.platform_role_permissions
  FOR SELECT TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Staff can read assignments" ON public.platform_staff_assignments
  FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()) OR user_id = auth.uid());

-- Prevent self-escalation and removal of the last super admin
CREATE OR REPLACE FUNCTION public.guard_platform_staff_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE active_supers int;
BEGIN
  IF auth.uid() IS NOT NULL AND COALESCE(NEW.user_id, OLD.user_id) = auth.uid() THEN
    RAISE EXCEPTION 'Platform staff cannot modify their own platform roles';
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'super_admin' AND OLD.is_active
     AND (TG_OP = 'DELETE' OR NEW.is_active = false OR NEW.role <> 'super_admin') THEN
    SELECT count(*) INTO active_supers FROM public.platform_staff_assignments
      WHERE role = 'super_admin' AND is_active;
    IF active_supers <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last active Super Admin';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_platform_staff
BEFORE INSERT OR UPDATE OR DELETE ON public.platform_staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.guard_platform_staff_changes();

-- ============ Audit log (append only) ============
CREATE TABLE public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  workspace_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  reason text,
  result text NOT NULL DEFAULT 'success',
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.platform_audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor ON public.platform_audit_logs(actor_user_id);
CREATE INDEX idx_audit_entity ON public.platform_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_workspace ON public.platform_audit_logs(workspace_id);
GRANT SELECT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff with audit read can view audit logs" ON public.platform_audit_logs
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.audit.read'));

-- ============ Support access sessions ============
CREATE TABLE public.platform_support_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  reason text NOT NULL,
  read_only boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_sessions_staff ON public.platform_support_access_sessions(staff_user_id);
CREATE INDEX idx_support_sessions_ws ON public.platform_support_access_sessions(workspace_id);
GRANT SELECT ON public.platform_support_access_sessions TO authenticated;
GRANT ALL ON public.platform_support_access_sessions TO service_role;
ALTER TABLE public.platform_support_access_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view support sessions" ON public.platform_support_access_sessions
  FOR SELECT TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.support.access') OR staff_user_id = auth.uid());

-- ============ Credit adjustment ledger (append only) ============
CREATE TABLE public.credit_adjustment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  category text NOT NULL,
  adjustment_type text NOT NULL,
  quantity numeric NOT NULL,
  previous_balance numeric,
  new_balance numeric,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'platform_admin',
  related_transaction text,
  actor_user_id uuid,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_ws ON public.credit_adjustment_ledger(workspace_id, created_at DESC);
GRANT SELECT ON public.credit_adjustment_ledger TO authenticated;
GRANT ALL ON public.credit_adjustment_ledger TO service_role;
ALTER TABLE public.credit_adjustment_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read credit ledger" ON public.credit_adjustment_ledger
  FOR SELECT TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.credits.adjust')
      OR public.has_platform_permission(auth.uid(), 'platform.billing.read')
      OR public.is_workspace_member(auth.uid(), workspace_id));

-- ============ Plans & plan versions ============
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_plans TO authenticated;
GRANT SELECT ON public.platform_plans TO anon;
GRANT ALL ON public.platform_plans TO service_role;
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.platform_plans FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.platform_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.platform_plans(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  monthly_price numeric NOT NULL DEFAULT 0,
  annual_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  trial_days int NOT NULL DEFAULT 0,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  overage_policy text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version)
);
GRANT SELECT ON public.platform_plan_versions TO authenticated;
GRANT SELECT ON public.platform_plan_versions TO anon;
GRANT ALL ON public.platform_plan_versions TO service_role;
ALTER TABLE public.platform_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan versions" ON public.platform_plan_versions FOR SELECT TO anon, authenticated USING (true);

-- ============ Account status on profiles ============
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('invited','active','suspended','deactivated','deletion_pending','anonymised');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

UPDATE public.profiles p
SET account_status = 'invited'
FROM auth.users u
WHERE u.id = p.id AND u.email_confirmed_at IS NULL AND u.last_sign_in_at IS NULL;

-- ============ Missing onboarding table ============
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  current_step int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  skipped_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist_dismissed boolean NOT NULL DEFAULT false,
  checklist_minimized boolean NOT NULL DEFAULT false,
  tour_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_onboarding_user_ws
  ON public.user_onboarding(user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their onboarding" ON public.user_onboarding
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff can read onboarding" ON public.user_onboarding
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.users.read'));
CREATE TRIGGER trg_user_onboarding_updated
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Platform-wide read access for staff ============
CREATE POLICY "Platform staff can view all workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.workspaces.read'));
CREATE POLICY "Platform staff can view all workspace members" ON public.workspace_members
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.workspaces.read'));
CREATE POLICY "Platform staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.users.read'));
CREATE POLICY "Platform staff can view subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.billing.read'));

-- ============ Seed permissions, role mappings, plans, staff ============
INSERT INTO public.platform_permissions (key, description, category) VALUES
  ('platform.access','Access the Platform Admin area','general'),
  ('platform.users.read','View platform users','users'),
  ('platform.users.suspend','Suspend or reactivate users','users'),
  ('platform.users.export','Export user data','users'),
  ('platform.roles.manage','Assign or remove platform roles','governance'),
  ('platform.workspaces.read','View all workspaces','workspaces'),
  ('platform.workspaces.suspend','Suspend or restore workspaces','workspaces'),
  ('platform.billing.read','View plans, subscriptions and invoices','billing'),
  ('platform.billing.modify','Change plans and subscriptions','billing'),
  ('platform.refunds.issue','Issue refunds','billing'),
  ('platform.credits.adjust','Adjust workspace credits','billing'),
  ('platform.support.access','Start controlled support access','support'),
  ('platform.automations.retry','Retry or pause automations','operations'),
  ('platform.integrations.diagnose','Diagnose integrations','operations'),
  ('platform.content.manage','Manage blog and content','content'),
  ('platform.audit.read','Read audit logs','governance'),
  ('platform.security.manage','Manage security settings','governance'),
  ('platform.settings.manage','Manage platform settings','governance')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'super_admin'::public.platform_role, key FROM public.platform_permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key) VALUES
  ('operations_admin','platform.access'),
  ('operations_admin','platform.users.read'),
  ('operations_admin','platform.users.suspend'),
  ('operations_admin','platform.workspaces.read'),
  ('operations_admin','platform.workspaces.suspend'),
  ('operations_admin','platform.automations.retry'),
  ('operations_admin','platform.integrations.diagnose'),
  ('operations_admin','platform.audit.read'),
  ('billing_admin','platform.access'),
  ('billing_admin','platform.users.read'),
  ('billing_admin','platform.workspaces.read'),
  ('billing_admin','platform.billing.read'),
  ('billing_admin','platform.billing.modify'),
  ('billing_admin','platform.refunds.issue'),
  ('billing_admin','platform.credits.adjust'),
  ('billing_admin','platform.audit.read'),
  ('support_agent','platform.access'),
  ('support_agent','platform.users.read'),
  ('support_agent','platform.workspaces.read'),
  ('support_agent','platform.support.access'),
  ('content_admin','platform.access'),
  ('content_admin','platform.content.manage'),
  ('compliance_admin','platform.access'),
  ('compliance_admin','platform.users.read'),
  ('compliance_admin','platform.users.export'),
  ('compliance_admin','platform.audit.read'),
  ('technical_admin','platform.access'),
  ('technical_admin','platform.workspaces.read'),
  ('technical_admin','platform.integrations.diagnose'),
  ('technical_admin','platform.automations.retry'),
  ('technical_admin','platform.audit.read'),
  ('analyst','platform.access'),
  ('analyst','platform.workspaces.read')
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_plans (code, name, description, position) VALUES
  ('starter','Starter','Entry plan for solo creators',1),
  ('plus','Plus','Growing businesses',2),
  ('pro','Pro','Scaling teams',3),
  ('enterprise','Enterprise','Custom contracts and volume',4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.platform_plan_versions (plan_id, version, is_current, monthly_price, annual_price, currency, trial_days)
SELECT p.id, 1, true,
  CASE p.code WHEN 'starter' THEN 15 WHEN 'plus' THEN 39 WHEN 'pro' THEN 79 ELSE 199 END,
  CASE p.code WHEN 'starter' THEN 144 WHEN 'plus' THEN 374 WHEN 'pro' THEN 758 ELSE 1910 END,
  'usd',
  CASE p.code WHEN 'starter' THEN 14 ELSE 0 END
FROM public.platform_plans p
WHERE NOT EXISTS (SELECT 1 FROM public.platform_plan_versions v WHERE v.plan_id = p.id);

-- Existing admin(s) become Super Admin (trigger bypassed: auth.uid() is null in migration)
INSERT INTO public.platform_staff_assignments (user_id, role, reason)
SELECT user_id, 'super_admin'::public.platform_role, 'Backfilled from legacy user_roles admin'
FROM public.user_roles WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;