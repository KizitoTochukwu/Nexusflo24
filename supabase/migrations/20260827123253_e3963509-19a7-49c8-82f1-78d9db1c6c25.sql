CREATE OR REPLACE FUNCTION public.platform_communications_metrics(_since timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      SELECT channel, jsonb_build_object(
        'messages', count(*),
        'credits', COALESCE(sum(credits_deducted), 0),
        'cost_cents', COALESCE(sum(cost_cents), 0)
      ) AS totals
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
$function$;

REVOKE EXECUTE ON FUNCTION public.platform_communications_metrics(timestamptz) FROM PUBLIC, anon;