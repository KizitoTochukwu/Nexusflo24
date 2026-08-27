-- ============ New permissions ============
INSERT INTO public.platform_permissions (key, description, category) VALUES
  ('platform.communications.manage','Approve, reject and suspend senders','operations'),
  ('platform.community.moderate','Remove or restore community content','content'),
  ('platform.fulfilment.manage','Manage automation-store fulfilment','operations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'super_admin'::public.platform_role, key FROM public.platform_permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key) VALUES
  ('operations_admin','platform.communications.manage'),
  ('operations_admin','platform.fulfilment.manage'),
  ('content_admin','platform.community.moderate'),
  ('technical_admin','platform.fulfilment.manage'),
  ('technical_admin','platform.communications.manage')
ON CONFLICT DO NOTHING;

-- ============ platform_settings ============
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the maintenance flag" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (key = 'maintenance');
CREATE POLICY "Platform staff can read all settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (public.is_platform_staff(auth.uid()));

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('maintenance', '{"enabled": false, "message": ""}', 'Maintenance-mode banner shown across workspace dashboards'),
  ('defaults', '{"trial_days": 14}', 'Platform defaults such as the standard trial length'),
  ('feature_flags', '{}', 'Feature flags keyed by plan code')
ON CONFLICT (key) DO NOTHING;

-- ============ platform_access_reviews ============
CREATE TABLE public.platform_access_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.platform_staff_assignments(id) ON DELETE SET NULL,
  subject_user_id UUID NOT NULL,
  reviewer_user_id UUID NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('confirmed','revoked')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.platform_access_reviews TO authenticated;
GRANT ALL ON public.platform_access_reviews TO service_role;
ALTER TABLE public.platform_access_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security managers can read access reviews" ON public.platform_access_reviews
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.security.manage'));
CREATE POLICY "Security managers can record access reviews" ON public.platform_access_reviews
  FOR INSERT TO authenticated WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.security.manage'));

-- ============ Community moderation columns ============
ALTER TABLE public.shop_community_posts
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by UUID,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;
ALTER TABLE public.shop_community_comments
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by UUID,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

-- ============ Platform-staff policies on migrated content tables ============
CREATE POLICY "Platform content admins can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.content.manage'))
  WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.content.manage'));

CREATE POLICY "Fulfilment managers can view store orders" ON public.store_orders
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'));
CREATE POLICY "Fulfilment managers can update store orders" ON public.store_orders
  FOR UPDATE TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'))
  WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'));
CREATE POLICY "Fulfilment managers can view store order items" ON public.store_order_items
  FOR SELECT TO authenticated USING (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'));
CREATE POLICY "Fulfilment managers can manage store projects" ON public.store_projects
  FOR ALL TO authenticated
  USING (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'))
  WITH CHECK (public.has_platform_permission(auth.uid(), 'platform.fulfilment.manage'));

-- ============ RPC: platform_communications_metrics ============
CREATE OR REPLACE FUNCTION public.platform_communications_metrics(_since TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH email_day AS (
    SELECT date_trunc('day', created_at) AS day,
           count(*) AS total,
           count(*) FILTER (WHERE status IN ('sent','delivered')) AS delivered,
           count(*) FILTER (WHERE status IN ('failed','bounced','error')) AS failed
    FROM public.email_send_log
    WHERE created_at >= _since
    GROUP BY 1
  ),
  sms_day AS (
    SELECT date_trunc('day', created_at) AS day,
           count(*) AS total,
           count(*) FILTER (WHERE status IN ('sent','delivered')) AS delivered,
           count(*) FILTER (WHERE status IN ('failed','error')) AS failed
    FROM public.sms_logs
    WHERE created_at >= _since AND direction = 'outbound'
    GROUP BY 1
  ),
  wa_day AS (
    SELECT date_trunc('day', created_at) AS day,
           count(*) AS total,
           count(*) FILTER (WHERE status IN ('sent','delivered','read')) AS delivered,
           count(*) FILTER (WHERE status IN ('failed','error')) AS failed
    FROM public.whatsapp_messages
    WHERE created_at >= _since AND direction = 'outbound'
    GROUP BY 1
  ),
  series AS (
    SELECT day,
           COALESCE(e.total, 0) AS email_total, COALESCE(e.delivered, 0) AS email_delivered, COALESCE(e.failed, 0) AS email_failed,
           COALESCE(s.total, 0) AS sms_total, COALESCE(s.delivered, 0) AS sms_delivered, COALESCE(s.failed, 0) AS sms_failed,
           COALESCE(w.total, 0) AS wa_total, COALESCE(w.delivered, 0) AS wa_delivered, COALESCE(w.failed, 0) AS wa_failed
    FROM (
      SELECT day FROM email_day
      UNION SELECT day FROM sms_day
      UNION SELECT day FROM wa_day
    ) days
    LEFT JOIN email_day e USING (day)
    LEFT JOIN sms_day s USING (day)
    LEFT JOIN wa_day w USING (day)
    ORDER BY day
  )
  SELECT jsonb_build_object(
    'email', (SELECT jsonb_build_object(
      'total', count(*),
      'by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM public.email_send_log WHERE created_at >= _since GROUP BY status) s), '{}'::jsonb)
    ) FROM public.email_send_log WHERE created_at >= _since),
    'sms', (SELECT jsonb_build_object(
      'total', count(*),
      'by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM public.sms_logs WHERE created_at >= _since AND direction = 'outbound' GROUP BY status) s), '{}'::jsonb)
    ) FROM public.sms_logs WHERE created_at >= _since AND direction = 'outbound'),
    'whatsapp', (SELECT jsonb_build_object(
      'total', count(*),
      'by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM public.whatsapp_messages WHERE created_at >= _since AND direction = 'outbound' GROUP BY status) s), '{}'::jsonb)
    ) FROM public.whatsapp_messages WHERE created_at >= _since AND direction = 'outbound'),
    'daily', COALESCE((SELECT jsonb_agg(to_jsonb(series)) FROM series), '[]'::jsonb),
    'usage', COALESCE((SELECT jsonb_object_agg(channel, totals) FROM (
      SELECT channel, jsonb_build_object('quantity', sum(quantity), 'credits', sum(credits_used)) AS totals
      FROM public.communication_usage WHERE created_at >= _since GROUP BY channel
    ) u), '{}'::jsonb),
    'workspaces_without_senders', (
      SELECT count(*) FROM public.workspaces w
      WHERE NOT EXISTS (SELECT 1 FROM public.sender_profiles sp WHERE sp.workspace_id = w.id AND sp.status = 'approved')
    ),
    'since', _since
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_communications_metrics(TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_communications_metrics(TIMESTAMPTZ) TO authenticated;

-- ============ RPC: platform_sender_queue ============
CREATE OR REPLACE FUNCTION public.platform_sender_queue()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'sender_profiles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sp.id, 'workspace_id', sp.workspace_id, 'workspace_name', w.name,
        'channel', sp.channel, 'label', sp.label, 'display_name', sp.display_name,
        'address', sp.address, 'status', sp.status, 'rejection_reason', sp.rejection_reason,
        'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.sender_profiles sp
      LEFT JOIN public.workspaces w ON w.id = sp.workspace_id
    ), '[]'::jsonb),
    'whatsapp_senders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ws.id, 'sender_profile_id', ws.sender_profile_id,
        'workspace_id', sp.workspace_id, 'workspace_name', w.name,
        'business_name', ws.business_name, 'phone_number', ws.phone_number,
        'provider', ws.provider, 'verification_status', ws.verification_status,
        'created_at', ws.created_at
      ) ORDER BY ws.created_at DESC)
      FROM public.whatsapp_senders ws
      LEFT JOIN public.sender_profiles sp ON sp.id = ws.sender_profile_id
      LEFT JOIN public.workspaces w ON w.id = sp.workspace_id
    ), '[]'::jsonb),
    'sms_senders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ss.id, 'sender_profile_id', ss.sender_profile_id,
        'workspace_id', sp.workspace_id, 'workspace_name', w.name,
        'display_name', ss.display_name, 'phone_number', ss.phone_number,
        'sender_type', ss.sender_type, 'verification_status', ss.verification_status,
        'created_at', ss.created_at
      ) ORDER BY ss.created_at DESC)
      FROM public.sms_senders ss
      LEFT JOIN public.sender_profiles sp ON sp.id = ss.sender_profile_id
      LEFT JOIN public.workspaces w ON w.id = sp.workspace_id
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_sender_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_sender_queue() TO authenticated;

-- ============ RPC: platform_automation_health ============
CREATE OR REPLACE FUNCTION public.platform_automation_health(_since TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'failed_runs', (SELECT count(*) FROM public.workflow_runs WHERE status = 'failed' AND ran_at >= _since AND is_test = false),
    'failed_automation_logs', (SELECT count(*) FROM public.automation_logs WHERE status IN ('failed','error') AND created_at >= _since),
    'stuck_enrollments', (SELECT count(*) FROM public.workflow_enrollments e
      WHERE e.status = 'active'
        AND e.last_step_at < now() - interval '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM public.scheduled_jobs j
          WHERE j.status = 'pending' AND j.payload->>'enrollment_id' = e.id::text
        )),
    'pending_jobs', (SELECT count(*) FROM public.scheduled_jobs WHERE status = 'pending'),
    'overdue_jobs', (SELECT count(*) FROM public.scheduled_jobs WHERE status = 'pending' AND run_at < now()),
    'failed_jobs', (SELECT count(*) FROM public.scheduled_jobs WHERE status = 'failed'),
    'runs_by_day', COALESCE((
      SELECT jsonb_agg(to_jsonb(d)) FROM (
        SELECT date_trunc('day', ran_at) AS day,
               count(*) AS total,
               count(*) FILTER (WHERE status = 'failed') AS failed
        FROM public.workflow_runs
        WHERE ran_at >= _since AND is_test = false
        GROUP BY 1 ORDER BY 1
      ) d
    ), '[]'::jsonb),
    'since', _since
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_automation_health(TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_automation_health(TIMESTAMPTZ) TO authenticated;

-- ============ RPC: platform_failed_runs ============
CREATE OR REPLACE FUNCTION public.platform_failed_runs(_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(r)) FROM (
      SELECT wr.id, wr.enrollment_id, wr.workflow_id, wf.name AS workflow_name,
             wr.workspace_id, w.name AS workspace_name,
             wr.node_type, wr.status, wr.error, wr.ran_at,
             e.status AS enrollment_status, e.current_node_id
      FROM public.workflow_runs wr
      LEFT JOIN public.workflows wf ON wf.id = wr.workflow_id
      LEFT JOIN public.workspaces w ON w.id = wr.workspace_id
      LEFT JOIN public.workflow_enrollments e ON e.id = wr.enrollment_id
      WHERE wr.status = 'failed' AND wr.is_test = false
      ORDER BY wr.ran_at DESC
      LIMIT LEAST(GREATEST(_limit, 1), 200)
    ) r
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.platform_failed_runs(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_failed_runs(INT) TO authenticated;

-- ============ RPC: platform_integration_health ============
CREATE OR REPLACE FUNCTION public.platform_integration_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'ads', (SELECT jsonb_build_object(
      'connected', count(*) FILTER (WHERE status = 'connected'),
      'error', count(*) FILTER (WHERE status IN ('error','disconnected') OR last_error IS NOT NULL),
      'expiring', count(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at < now() + interval '7 days')
    ) FROM public.ad_connections WHERE is_demo = false),
    'whatsapp', (SELECT jsonb_build_object(
      'connected', count(*) FILTER (WHERE verification_status = 'verified'),
      'pending', count(*) FILTER (WHERE verification_status = 'pending'),
      'total', count(*)
    ) FROM public.whatsapp_accounts),
    'google_calendar', (SELECT jsonb_build_object(
      'connected', count(*),
      'expiring', count(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at < now() + interval '1 day')
    ) FROM public.google_calendar_tokens),
    'stripe_connect', (SELECT jsonb_build_object(
      'connected', count(*) FILTER (WHERE disconnected_at IS NULL AND charges_enabled),
      'incomplete', count(*) FILTER (WHERE disconnected_at IS NULL AND NOT charges_enabled),
      'disconnected', count(*) FILTER (WHERE disconnected_at IS NOT NULL)
    ) FROM public.seller_payment_accounts WHERE provider = 'stripe'),
    'meta', (SELECT jsonb_build_object(
      'connected', count(*) FILTER (WHERE is_active),
      'expiring', count(*) FILTER (WHERE is_active AND token_expires_at IS NOT NULL AND token_expires_at < now() + interval '7 days')
    ) FROM public.meta_settings),
    'ad_connections', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'workspace_id', c.workspace_id, 'workspace_name', w.name,
        'provider', c.provider, 'status', c.status, 'business_name', c.business_name,
        'token_expires_at', c.token_expires_at, 'last_sync_at', c.last_sync_at, 'last_error', c.last_error
      ) ORDER BY c.updated_at DESC)
      FROM public.ad_connections c
      LEFT JOIN public.workspaces w ON w.id = c.workspace_id
      WHERE c.is_demo = false
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_integration_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_integration_health() TO authenticated;

-- ============ RPC: platform_fulfilment_overview ============
CREATE OR REPLACE FUNCTION public.platform_fulfilment_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'orders_by_status', COALESCE((
      SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) AS n FROM public.store_orders GROUP BY status
      ) s
    ), '{}'::jsonb),
    'projects_by_status', COALESCE((
      SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) AS n FROM public.store_projects GROUP BY status
      ) s
    ), '{}'::jsonb),
    'paid_without_project', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'order_id', o.id, 'email', o.email, 'business_name', o.business_name,
        'total_pence', o.total_pence, 'paid_at', o.paid_at, 'plan_slug', o.plan_slug
      ) ORDER BY o.paid_at DESC)
      FROM public.store_orders o
      WHERE o.status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM public.store_projects p WHERE p.order_id = o.id)
    ), '[]'::jsonb),
    'recent_projects', COALESCE((
      SELECT jsonb_agg(to_jsonb(p)) FROM (
        SELECT id, order_id, name, product_slug, status, progress, created_at, go_live_at
        FROM public.store_projects ORDER BY created_at DESC LIMIT 20
      ) p
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_fulfilment_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_fulfilment_overview() TO authenticated;

-- ============ RPC: platform_health_jobs ============
CREATE OR REPLACE FUNCTION public.platform_health_jobs()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'jobs_by_status', COALESCE((
      SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) AS n FROM public.scheduled_jobs GROUP BY status
      ) s
    ), '{}'::jsonb),
    'next_pending_run_at', (SELECT min(run_at) FROM public.scheduled_jobs WHERE status = 'pending'),
    'overdue_jobs', (SELECT count(*) FROM public.scheduled_jobs WHERE status = 'pending' AND run_at < now()),
    'recent_failed_jobs', COALESCE((
      SELECT jsonb_agg(to_jsonb(j)) FROM (
        SELECT id, workspace_id, automation_id, run_at, status, error, updated_at
        FROM public.scheduled_jobs WHERE status = 'failed'
        ORDER BY updated_at DESC LIMIT 20
      ) j
    ), '[]'::jsonb),
    'email_send_state', (SELECT to_jsonb(s) FROM public.email_send_state s LIMIT 1),
    'queued_emails', (SELECT count(*) FROM public.email_send_log WHERE status = 'queued')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_health_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_health_jobs() TO authenticated;

-- ============ RPC: platform_community_moderation ============
CREATE OR REPLACE FUNCTION public.platform_community_moderation(_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'posts', COALESCE((
      SELECT jsonb_agg(to_jsonb(p)) FROM (
        SELECT p.id, p.workspace_id, w.name AS workspace_name, p.community_id, c.name AS community_name,
               p.author_name, p.title, left(p.body, 280) AS excerpt,
               p.comment_count, p.like_count, p.removed_at, p.created_at
        FROM public.shop_community_posts p
        LEFT JOIN public.workspaces w ON w.id = p.workspace_id
        LEFT JOIN public.shop_communities c ON c.id = p.community_id
        ORDER BY p.created_at DESC
        LIMIT LEAST(GREATEST(_limit, 1), 200)
      ) p
    ), '[]'::jsonb),
    'comments', COALESCE((
      SELECT jsonb_agg(to_jsonb(p)) FROM (
        SELECT cm.id, cm.workspace_id, w.name AS workspace_name, cm.community_id, c.name AS community_name,
               cm.post_id, cm.author_name, left(cm.body, 280) AS excerpt,
               cm.removed_at, cm.created_at
        FROM public.shop_community_comments cm
        LEFT JOIN public.workspaces w ON w.id = cm.workspace_id
        LEFT JOIN public.shop_communities c ON c.id = cm.community_id
        ORDER BY cm.created_at DESC
        LIMIT LEAST(GREATEST(_limit, 1), 200)
      ) p
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.platform_community_moderation(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_community_moderation(INT) TO authenticated;
