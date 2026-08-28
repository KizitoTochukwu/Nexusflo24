CREATE OR REPLACE FUNCTION public.client_finder_report(_workspace_id uuid, _from timestamp with time zone, _to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'open_value', coalesce(sum(d.amount) FILTER (WHERE d.status = 'open'), 0),
        'won_value', coalesce(sum(d.amount) FILTER (WHERE d.status = 'won'), 0)
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
      'open_value', 'Sum of the amount on those deals still open.'
    )
  ) INTO result;

  RETURN result;
END;
$function$;