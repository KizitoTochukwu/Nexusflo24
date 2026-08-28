
-- ============ Plan limits ============
CREATE TABLE IF NOT EXISTS public.prospecting_plan_limits (
  plan text PRIMARY KEY,
  max_campaigns integer NOT NULL DEFAULT 3,
  max_mailboxes integer NOT NULL DEFAULT 1,
  monthly_emails integer NOT NULL DEFAULT 500,
  monthly_ai_ops integer NOT NULL DEFAULT 100,
  monthly_verifications integer NOT NULL DEFAULT 200,
  monthly_discoveries integer NOT NULL DEFAULT 200,
  exports_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prospecting_plan_limits TO authenticated;
GRANT ALL ON public.prospecting_plan_limits TO service_role;
ALTER TABLE public.prospecting_plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_limits_read" ON public.prospecting_plan_limits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cf_limits_staff_write" ON public.prospecting_plan_limits
  FOR ALL TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage'))
  WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage'));

CREATE TRIGGER trg_cf_limits_updated_at BEFORE UPDATE ON public.prospecting_plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.prospecting_plan_limits
  (plan, max_campaigns, max_mailboxes, monthly_emails, monthly_ai_ops, monthly_verifications, monthly_discoveries, exports_enabled)
VALUES
  ('starter', 1, 1, 250, 50, 100, 100, false),
  ('plus', 3, 2, 1500, 250, 500, 500, true),
  ('pro', 10, 5, 6000, 1000, 2000, 2000, true),
  ('enterprise', 100, 25, 50000, 10000, 20000, 20000, true)
ON CONFLICT (plan) DO NOTHING;

-- ============ Workspace controls ============
CREATE TABLE IF NOT EXISTS public.prospecting_workspace_controls (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  suspended boolean NOT NULL DEFAULT false,
  suspension_reason text,
  limit_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prospecting_workspace_controls TO authenticated;
GRANT ALL ON public.prospecting_workspace_controls TO service_role;
ALTER TABLE public.prospecting_workspace_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_controls_member_read" ON public.prospecting_workspace_controls
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id)
      OR public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage'));
CREATE POLICY "cf_controls_staff_write" ON public.prospecting_workspace_controls
  FOR ALL TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage'))
  WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage'));

CREATE TRIGGER trg_cf_controls_updated_at BEFORE UPDATE ON public.prospecting_workspace_controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Permissions ============
INSERT INTO public.platform_permissions (key, description, category) VALUES
  ('platform.clientfinder.manage','Manage AI Client Finder limits and workspace access','operations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'super_admin'::public.platform_role, 'platform.clientfinder.manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key) VALUES
  ('operations_admin','platform.clientfinder.manage'),
  ('technical_admin','platform.clientfinder.manage')
ON CONFLICT DO NOTHING;

-- ============ Entitlements ============
CREATE OR REPLACE FUNCTION public.client_finder_entitlements(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limits public.prospecting_plan_limits%ROWTYPE;
  v_ctl public.prospecting_workspace_controls%ROWTYPE;
  v_overrides jsonb := '{}'::jsonb;
  v_period_start timestamptz := date_trunc('month', now());
  v_emails int; v_ai int; v_verif int; v_disc int; v_campaigns int; v_mailboxes int;
  v_eff jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_workspace_member(auth.uid(), _workspace_id)
     AND NOT public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT lower(coalesce(s.plan, 'starter')) INTO v_plan
  FROM public.subscriptions s
  WHERE s.workspace_id = _workspace_id AND s.status IN ('active','trialing')
  ORDER BY s.updated_at DESC LIMIT 1;

  v_plan := coalesce(v_plan, 'starter');

  SELECT * INTO v_limits FROM public.prospecting_plan_limits WHERE plan = v_plan;
  IF NOT FOUND THEN
    SELECT * INTO v_limits FROM public.prospecting_plan_limits WHERE plan = 'starter';
  END IF;

  SELECT * INTO v_ctl FROM public.prospecting_workspace_controls WHERE workspace_id = _workspace_id;
  IF FOUND THEN v_overrides := coalesce(v_ctl.limit_overrides, '{}'::jsonb); END IF;

  SELECT count(*) INTO v_emails FROM public.prospecting_outbound_emails
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND status NOT IN ('failed','cancelled');
  SELECT count(*) INTO v_ai FROM public.prospecting_usage_events
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND operation LIKE 'ai_%';
  SELECT count(*) INTO v_verif FROM public.prospecting_usage_events
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND operation = 'verification';
  SELECT count(*) INTO v_disc FROM public.prospecting_usage_events
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND operation IN ('discovery','import');
  SELECT count(*) INTO v_campaigns FROM public.prospecting_campaigns
    WHERE workspace_id = _workspace_id AND archived_at IS NULL;
  SELECT count(*) INTO v_mailboxes FROM public.prospecting_mailboxes
    WHERE workspace_id = _workspace_id AND status <> 'disconnected';

  v_eff := jsonb_build_object(
    'max_campaigns', coalesce((v_overrides->>'max_campaigns')::int, v_limits.max_campaigns),
    'max_mailboxes', coalesce((v_overrides->>'max_mailboxes')::int, v_limits.max_mailboxes),
    'monthly_emails', coalesce((v_overrides->>'monthly_emails')::int, v_limits.monthly_emails),
    'monthly_ai_ops', coalesce((v_overrides->>'monthly_ai_ops')::int, v_limits.monthly_ai_ops),
    'monthly_verifications', coalesce((v_overrides->>'monthly_verifications')::int, v_limits.monthly_verifications),
    'monthly_discoveries', coalesce((v_overrides->>'monthly_discoveries')::int, v_limits.monthly_discoveries),
    'exports_enabled', coalesce((v_overrides->>'exports_enabled')::boolean, v_limits.exports_enabled)
  );

  RETURN jsonb_build_object(
    'workspace_id', _workspace_id,
    'plan', v_plan,
    'enabled', coalesce(v_ctl.enabled, true),
    'suspended', coalesce(v_ctl.suspended, false),
    'suspension_reason', v_ctl.suspension_reason,
    'period_start', v_period_start,
    'limits', v_eff,
    'usage', jsonb_build_object(
      'emails', v_emails,
      'ai_ops', v_ai,
      'verifications', v_verif,
      'discoveries', v_disc,
      'campaigns', v_campaigns,
      'mailboxes', v_mailboxes
    ),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.client_finder_entitlements(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.client_finder_entitlements(uuid) TO authenticated, service_role;

-- ============ Reporting ============
CREATE OR REPLACE FUNCTION public.client_finder_report(_workspace_id uuid, _from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'generated_at', now(),
    'prospects', (
      SELECT jsonb_build_object(
        'companies', count(*),
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'rejected', count(*) FILTER (WHERE status = 'rejected'),
        'scored', count(*) FILTER (WHERE fit_score IS NOT NULL)
      ) FROM public.prospect_companies
      WHERE workspace_id = _workspace_id AND created_at >= _from AND created_at < _to
    ),
    'contacts', (
      SELECT jsonb_build_object(
        'total', count(*),
        'verified', count(*) FILTER (WHERE email_status = 'verified')
      ) FROM public.prospect_contacts
      WHERE workspace_id = _workspace_id AND created_at >= _from AND created_at < _to
    ),
    'emails', (
      SELECT jsonb_build_object(
        'queued', count(*) FILTER (WHERE status = 'queued'),
        'sent', count(*) FILTER (WHERE status = 'sent'),
        'failed', count(*) FILTER (WHERE status = 'failed')
      ) FROM public.prospecting_outbound_emails
      WHERE workspace_id = _workspace_id AND created_at >= _from AND created_at < _to
    ),
    'replies', (
      SELECT coalesce(jsonb_object_agg(classification, n), '{}'::jsonb) FROM (
        SELECT coalesce(classification, 'unclassified') AS classification, count(*) AS n
        FROM public.prospecting_replies
        WHERE workspace_id = _workspace_id AND created_at >= _from AND created_at < _to
        GROUP BY 1
      ) t
    ),
    'reply_total', (
      SELECT count(*) FROM public.prospecting_replies
      WHERE workspace_id = _workspace_id AND created_at >= _from AND created_at < _to
    ),
    'crm', (
      SELECT jsonb_build_object(
        'deals', count(*),
        'open_value', coalesce(sum(d.value) FILTER (WHERE d.status = 'open'), 0),
        'won_value', coalesce(sum(d.value) FILTER (WHERE d.status = 'won'), 0)
      ) FROM public.crm_deals d
      WHERE d.workspace_id = _workspace_id AND d.source = 'ai_client_finder'
        AND d.created_at >= _from AND d.created_at < _to
    ),
    'campaigns', (
      SELECT jsonb_build_object(
        'total', count(*),
        'active', count(*) FILTER (WHERE status = 'active'),
        'paused', count(*) FILTER (WHERE status = 'paused')
      ) FROM public.prospecting_campaigns
      WHERE workspace_id = _workspace_id AND archived_at IS NULL
    ),
    'definitions', jsonb_build_object(
      'companies', 'Prospect companies created in the range.',
      'approved', 'Prospect companies whose status is approved.',
      'sent', 'Outbound emails whose stored status is sent — accepted by the sending provider, not proof of inbox delivery.',
      'replies', 'Logged replies grouped by their stored classification, including user corrections.',
      'deals', 'CRM deals created in the range with source ai_client_finder.',
      'open_value', 'Sum of value on those deals still open.'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.client_finder_report(uuid, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.client_finder_report(uuid, timestamptz, timestamptz) TO authenticated;

-- ============ Platform health ============
CREATE OR REPLACE FUNCTION public.platform_client_finder_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_platform_permission(auth.uid(), 'platform.clientfinder.manage') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'totals', jsonb_build_object(
      'workspaces_using', (SELECT count(DISTINCT workspace_id) FROM public.prospecting_campaigns),
      'campaigns', (SELECT count(*) FROM public.prospecting_campaigns WHERE archived_at IS NULL),
      'active_campaigns', (SELECT count(*) FROM public.prospecting_campaigns WHERE status = 'active'),
      'mailboxes', (SELECT count(*) FROM public.prospecting_mailboxes WHERE status <> 'disconnected'),
      'prospect_companies', (SELECT count(*) FROM public.prospect_companies)
    ),
    'emails_30d', (
      SELECT jsonb_build_object(
        'sent', count(*) FILTER (WHERE status = 'sent'),
        'failed', count(*) FILTER (WHERE status = 'failed'),
        'queued', count(*) FILTER (WHERE status = 'queued')
      ) FROM public.prospecting_outbound_emails WHERE created_at > now() - interval '30 days'
    ),
    'replies_30d', (
      SELECT count(*) FROM public.prospecting_replies WHERE created_at > now() - interval '30 days'
    ),
    'queue', (
      SELECT jsonb_build_object(
        'due_now', count(*) FILTER (WHERE next_send_at IS NOT NULL AND next_send_at <= now() AND status = 'active'),
        'active', count(*) FILTER (WHERE status = 'active')
      ) FROM public.prospecting_enrolments
    ),
    'controls', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'workspace_id', c.workspace_id,
        'workspace_name', w.name,
        'enabled', c.enabled,
        'suspended', c.suspended,
        'suspension_reason', c.suspension_reason,
        'limit_overrides', c.limit_overrides,
        'updated_at', c.updated_at
      ) ORDER BY c.updated_at DESC), '[]'::jsonb)
      FROM public.prospecting_workspace_controls c
      LEFT JOIN public.workspaces w ON w.id = c.workspace_id
    ),
    'plan_limits', (
      SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.plan), '[]'::jsonb)
      FROM public.prospecting_plan_limits l
    ),
    'top_workspaces', (
      SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT e.workspace_id, w.name AS workspace_name,
               count(*) FILTER (WHERE e.status = 'sent') AS sent,
               count(*) FILTER (WHERE e.status = 'failed') AS failed
        FROM public.prospecting_outbound_emails e
        LEFT JOIN public.workspaces w ON w.id = e.workspace_id
        WHERE e.created_at > now() - interval '30 days'
        GROUP BY e.workspace_id, w.name
        ORDER BY count(*) DESC
        LIMIT 20
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_client_finder_health() FROM public;
GRANT EXECUTE ON FUNCTION public.platform_client_finder_health() TO authenticated;
