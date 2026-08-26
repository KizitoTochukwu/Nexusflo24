CREATE OR REPLACE FUNCTION public.platform_overview_metrics(_since timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb; s timestamptz := COALESCE(_since, now() - interval '30 days');
BEGIN
  IF NOT public.has_platform_permission(auth.uid(), 'platform.access') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'new_users', (SELECT count(*) FROM auth.users WHERE created_at >= s),
    'verified_users', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'active_users', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= s),
    'suspended_users', (SELECT count(*) FROM public.profiles WHERE account_status = 'suspended'),
    'total_workspaces', (SELECT count(*) FROM public.workspaces),
    'new_workspaces', (SELECT count(*) FROM public.workspaces WHERE created_at >= s),
    'subs_active', (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'subs_trialing', (SELECT count(*) FROM public.subscriptions WHERE status = 'trialing'),
    'subs_past_due', (SELECT count(*) FROM public.subscriptions WHERE status IN ('past_due','unpaid')),
    'subs_cancelled', (SELECT count(*) FROM public.subscriptions WHERE status IN ('canceled','cancelled')),
    'mrr', (
      SELECT COALESCE(sum(
        CASE WHEN sub.billing_cycle = 'yearly' THEN v.annual_price / 12.0 ELSE v.monthly_price END
      ), 0)
      FROM public.subscriptions sub
      JOIN public.platform_plans p ON p.code = sub.plan
      JOIN public.platform_plan_versions v ON v.plan_id = p.id AND v.is_current
      WHERE sub.status IN ('active','trialing')
    ),
    'plan_distribution', (
      SELECT COALESCE(jsonb_object_agg(plan, c), '{}'::jsonb)
      FROM (SELECT COALESCE(plan,'none') AS plan, count(*) AS c FROM public.subscriptions GROUP BY 1) t
    ),
    'store_orders', (SELECT count(*) FROM public.store_orders),
    'store_orders_paid', (SELECT count(*) FROM public.store_orders WHERE status = 'paid'),
    'fulfilment_projects', (SELECT count(*) FROM public.store_projects),
    'orders_missing_projects', (
      SELECT count(*) FROM public.store_orders o
      WHERE o.status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM public.store_projects pr WHERE pr.order_id = o.id)
    ),
    'user_growth', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
            FROM auth.users WHERE created_at >= s GROUP BY 1) g
    ),
    'workspace_growth', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
            FROM public.workspaces WHERE created_at >= s GROUP BY 1) g
    ),
    'recent_users', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at) AS x
        FROM auth.users u ORDER BY u.created_at DESC LIMIT 8
      ) r
    ),
    'since', s
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.platform_overview_metrics(timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_overview_metrics(timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.platform_users_list(
  _search text DEFAULT NULL, _status text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE rows jsonb; total int;
BEGIN
  IF NOT public.has_platform_permission(auth.uid(), 'platform.users.read') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH base AS (
    SELECT u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           COALESCE(u.raw_app_meta_data->>'provider','email') AS provider,
           p.full_name, COALESCE(p.account_status::text,'active') AS account_status,
           (SELECT count(*) FROM public.workspace_members m WHERE m.user_id = u.id) AS workspaces,
           (SELECT s.plan FROM public.subscriptions s WHERE s.user_id = u.id LIMIT 1) AS plan,
           (SELECT s.status FROM public.subscriptions s WHERE s.user_id = u.id LIMIT 1) AS sub_status,
           EXISTS (SELECT 1 FROM public.platform_staff_assignments a WHERE a.user_id = u.id AND a.is_active) AS is_staff,
           (SELECT a.role::text FROM public.platform_staff_assignments a WHERE a.user_id = u.id AND a.is_active LIMIT 1) AS platform_role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE (_search IS NULL OR _search = '' OR u.email ILIKE '%'||_search||'%' OR COALESCE(p.full_name,'') ILIKE '%'||_search||'%')
      AND (_status IS NULL OR _status = '' OR COALESCE(p.account_status::text,'active') = _status)
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.created_at DESC), '[]'::jsonb), (SELECT count(*) FROM base)
  INTO rows, total
  FROM (SELECT * FROM base ORDER BY created_at DESC LIMIT GREATEST(_limit,1) OFFSET GREATEST(_offset,0)) b;

  RETURN jsonb_build_object('rows', rows, 'total', total);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.platform_users_list(text, text, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_users_list(text, text, int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.platform_workspaces_list(
  _search text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE rows jsonb; total int;
BEGIN
  IF NOT public.has_platform_permission(auth.uid(), 'platform.workspaces.read') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH base AS (
    SELECT w.id, w.name, w.created_at, w.owner_user_id,
           (SELECT u.email FROM auth.users u WHERE u.id = w.owner_user_id) AS owner_email,
           (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id) AS members,
           (SELECT count(*) FROM public.leads l WHERE l.workspace_id = w.id) AS leads,
           (SELECT s.plan FROM public.subscriptions s WHERE s.user_id = w.owner_user_id LIMIT 1) AS plan,
           (SELECT s.status FROM public.subscriptions s WHERE s.user_id = w.owner_user_id LIMIT 1) AS sub_status
    FROM public.workspaces w
    WHERE (_search IS NULL OR _search = '' OR w.name ILIKE '%'||_search||'%')
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.created_at DESC), '[]'::jsonb), (SELECT count(*) FROM base)
  INTO rows, total
  FROM (SELECT * FROM base ORDER BY created_at DESC LIMIT GREATEST(_limit,1) OFFSET GREATEST(_offset,0)) b;

  RETURN jsonb_build_object('rows', rows, 'total', total);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.platform_workspaces_list(text, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_workspaces_list(text, int, int) TO authenticated, service_role;