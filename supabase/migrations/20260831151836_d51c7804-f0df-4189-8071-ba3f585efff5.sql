CREATE OR REPLACE FUNCTION public.crm_metric_snapshot(_workspace_id uuid, _from timestamp with time zone DEFAULT (now() - '30 days'::interval), _to timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF _workspace_id IS NULL OR NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  SELECT jsonb_build_object(
    'window', jsonb_build_object('from', _from, 'to', _to),
    'contacts_total', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.archived_at IS NULL),
    'contacts_new', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.archived_at IS NULL AND c.created_at >= _from AND c.created_at <= _to),
    'contacts_mql', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.lifecycle_stage = 'marketing_qualified_lead'),
    'contacts_sql', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.lifecycle_stage = 'sales_qualified_lead'),
    'contacts_opportunity', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.lifecycle_stage = 'opportunity'),
    'contacts_customers', (SELECT count(*) FROM contacts c WHERE c.workspace_id = _workspace_id AND c.merged_into_id IS NULL AND c.lifecycle_stage = 'customer'),
    'leads_total', (SELECT count(*) FROM leads l WHERE l.workspace_id = _workspace_id),
    'leads_new', (SELECT count(*) FROM leads l WHERE l.workspace_id = _workspace_id AND l.created_at >= _from AND l.created_at <= _to),
    'leads_unlinked', (SELECT count(*) FROM leads l WHERE l.workspace_id = _workspace_id AND l.contact_id IS NULL),
    'deals_open', (SELECT count(*) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'open'),
    'deals_open_value', (SELECT coalesce(sum(d.amount), 0) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'open'),
    'deals_weighted_value', (SELECT coalesce(sum(d.amount * coalesce(d.probability, 0) / 100.0), 0) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'open'),
    'deals_won', (SELECT count(*) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'won' AND d.closed_at >= _from AND d.closed_at <= _to),
    'deals_won_value', (SELECT coalesce(sum(d.amount), 0) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'won' AND d.closed_at >= _from AND d.closed_at <= _to),
    'deals_lost', (SELECT count(*) FROM crm_deals d WHERE d.workspace_id = _workspace_id AND d.status = 'lost' AND d.closed_at >= _from AND d.closed_at <= _to),
    'tasks_open', (SELECT count(*) FROM crm_tasks t WHERE t.workspace_id = _workspace_id AND t.status NOT IN ('done', 'completed', 'cancelled')),
    'tasks_overdue', (SELECT count(*) FROM crm_tasks t WHERE t.workspace_id = _workspace_id AND t.status NOT IN ('done', 'completed', 'cancelled') AND t.due_date IS NOT NULL AND t.due_date < now()),
    'form_submissions', (SELECT count(*) FROM form_submissions s WHERE s.workspace_id = _workspace_id AND s.created_at >= _from AND s.created_at <= _to),
    'form_unique_contacts', (SELECT count(DISTINCT s.contact_id) FROM form_submissions s WHERE s.workspace_id = _workspace_id AND s.contact_id IS NOT NULL AND s.created_at >= _from AND s.created_at <= _to),
    'form_unlinked', (SELECT count(*) FROM form_submissions s WHERE s.workspace_id = _workspace_id AND s.contact_id IS NULL),
    'bookings_total', (SELECT count(*) FROM bookings b WHERE b.workspace_id = _workspace_id AND b.start_time >= _from AND b.start_time <= _to),
    'bookings_upcoming', (SELECT count(*) FROM bookings b WHERE b.workspace_id = _workspace_id AND b.status = 'confirmed' AND b.start_time >= now()),
    'bookings_completed', (SELECT count(*) FROM bookings b WHERE b.workspace_id = _workspace_id AND b.status = 'completed' AND b.start_time >= _from AND b.start_time <= _to),
    'bookings_cancelled', (SELECT count(*) FROM bookings b WHERE b.workspace_id = _workspace_id AND b.status = 'cancelled' AND b.start_time >= _from AND b.start_time <= _to),
    'bookings_no_show', (SELECT count(*) FROM bookings b WHERE b.workspace_id = _workspace_id AND b.status = 'no_show' AND b.start_time >= _from AND b.start_time <= _to),
    'bookings_show_rate', (
      SELECT CASE WHEN count(*) FILTER (WHERE b.status IN ('completed', 'no_show')) = 0 THEN NULL
             ELSE round(100.0 * count(*) FILTER (WHERE b.status = 'completed') / count(*) FILTER (WHERE b.status IN ('completed', 'no_show')), 1) END
      FROM bookings b WHERE b.workspace_id = _workspace_id AND b.start_time >= _from AND b.start_time <= _to
    ),
    'enrolments_total', (SELECT count(*) FROM workflow_enrollments e WHERE e.workspace_id = _workspace_id AND coalesce(e.is_test, false) = false AND e.started_at >= _from AND e.started_at <= _to),
    'enrolments_active', (SELECT count(*) FROM workflow_enrollments e WHERE e.workspace_id = _workspace_id AND coalesce(e.is_test, false) = false AND e.status = 'active'),
    'enrolments_completed', (SELECT count(*) FROM workflow_enrollments e WHERE e.workspace_id = _workspace_id AND coalesce(e.is_test, false) = false AND e.status = 'completed' AND e.completed_at >= _from AND e.completed_at <= _to),
    'enrolments_failed', (SELECT count(*) FROM workflow_enrollments e WHERE e.workspace_id = _workspace_id AND coalesce(e.is_test, false) = false AND e.status = 'failed' AND e.started_at >= _from AND e.started_at <= _to),
    'orders_paid', (SELECT count(*) FROM shop_orders o WHERE o.workspace_id = _workspace_id AND o.paid_at IS NOT NULL AND o.status NOT IN ('cancelled', 'refunded') AND o.paid_at >= _from AND o.paid_at <= _to),
    'revenue_minor', (SELECT coalesce(sum(o.total_amount - coalesce(o.refunded_amount, 0)), 0) FROM shop_orders o WHERE o.workspace_id = _workspace_id AND o.paid_at IS NOT NULL AND o.status NOT IN ('cancelled', 'refunded') AND o.paid_at >= _from AND o.paid_at <= _to),
    'orders_unlinked', (SELECT count(*) FROM shop_orders o WHERE o.workspace_id = _workspace_id AND o.paid_at IS NOT NULL AND o.contact_id IS NULL),
    'messages_delivered', (SELECT count(*) FROM campaign_messages m WHERE m.workspace_id = _workspace_id AND m.delivery_status IN ('delivered', 'sent') AND m.created_at >= _from AND m.created_at <= _to),
    'open_rate', (
      SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(100.0 * count(*) FILTER (WHERE m.opened) / count(*), 1) END
      FROM campaign_messages m WHERE m.workspace_id = _workspace_id AND m.delivery_status IN ('delivered', 'sent') AND m.created_at >= _from AND m.created_at <= _to
    ),
    'click_rate', (
      SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(100.0 * count(*) FILTER (WHERE m.clicked) / count(*), 1) END
      FROM campaign_messages m WHERE m.workspace_id = _workspace_id AND m.delivery_status IN ('delivered', 'sent') AND m.created_at >= _from AND m.created_at <= _to
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_automation_events(_workspace_id uuid, _entries jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted integer := 0;
BEGIN
  IF _workspace_id IS NULL OR NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  WITH rows AS (
    INSERT INTO public.automation_logs (workspace_id, automation_id, lead_id, event_type, status, details)
    SELECT _workspace_id,
           nullif(e->>'automation_id', '')::uuid,
           nullif(e->>'lead_id', '')::uuid,
           coalesce(e->>'event_type', 'event'),
           coalesce(e->>'status', 'success'),
           coalesce(e->'details', '{}'::jsonb)
    FROM jsonb_array_elements(coalesce(_entries, '[]'::jsonb)) AS e
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM rows;

  RETURN inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.log_automation_events(uuid, jsonb) TO authenticated;