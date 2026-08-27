CREATE OR REPLACE FUNCTION public.platform_whatsapp_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'metrics', (
      SELECT jsonb_build_object(
        'submitted', count(*) FILTER (WHERE status = 'submitted'),
        'sent', count(*) FILTER (WHERE status = 'sent'),
        'delivered', count(*) FILTER (WHERE status = 'delivered'),
        'read', count(*) FILTER (WHERE status = 'read'),
        'failed', count(*) FILTER (WHERE status = 'failed'),
        'pending', count(*) FILTER (WHERE status IN ('queued','pending')),
        'unconfirmed', count(*) FILTER (
          WHERE status IN ('submitted','queued') AND created_at < now() - interval '15 minutes'
        )
      )
      FROM public.whatsapp_messages
      WHERE direction = 'outbound' AND created_at > now() - interval '30 days'
    ),
    'last_webhook_at', (SELECT max(received_at) FROM public.whatsapp_webhook_events),
    'webhook_events_24h', (SELECT count(*) FROM public.whatsapp_webhook_events WHERE received_at > now() - interval '24 hours'),
    'health', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.updated_at DESC NULLS LAST)
      FROM public.whatsapp_provider_health h
    ), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT m.id, m.workspace_id, w.name AS workspace_name, m.status, m.template_name,
               m.language_code, m.waba_id, m.sender_phone_number_id, m.sender_ownership,
               m.wa_message_id, m.error, m.error_code, m.error_details, m.fbtrace_id,
               m.created_at, m.submitted_at, m.sent_at, m.delivered_at, m.read_at, m.failed_at
        FROM public.whatsapp_messages m
        LEFT JOIN public.workspaces w ON w.id = m.workspace_id
        WHERE m.direction = 'outbound'
        ORDER BY m.created_at DESC
        LIMIT 100
      ) r
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_whatsapp_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_whatsapp_health() TO authenticated;