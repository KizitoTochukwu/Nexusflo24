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
  v_ai_ops text[] := ARRAY['generate_icp','score_fit','generate_sequence','classify_reply','draft_reply','website_analysis','analyse_offer'];
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
      AND operation = ANY (v_ai_ops);
  SELECT count(*) INTO v_verif FROM public.prospecting_usage_events
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND operation IN ('verification','verify_email');
  SELECT count(*) INTO v_disc FROM public.prospecting_usage_events
    WHERE workspace_id = _workspace_id AND created_at >= v_period_start
      AND operation IN ('discovery','import','csv_import');
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