CREATE OR REPLACE FUNCTION public.crm_link_conversation_contact(_workspace_id uuid, _channel text, _identifier text, _contact_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _n text;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _channel NOT IN ('whatsapp', 'sms') THEN
    RAISE EXCEPTION 'invalid channel';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = _contact_id AND workspace_id = _workspace_id AND merged_into_id IS NULL
  ) THEN
    RAISE EXCEPTION 'contact not found in workspace';
  END IF;

  _n := public.crm_normalize_phone(_identifier);

  IF _channel = 'whatsapp' THEN
    UPDATE public.whatsapp_messages m
    SET contact_id = _contact_id
    WHERE m.workspace_id = _workspace_id
      AND public.crm_normalize_phone(m.phone_number) = _n
      AND (m.contact_id IS DISTINCT FROM _contact_id);
    GET DIAGNOSTICS _count = ROW_COUNT;
  ELSE
    UPDATE public.sms_logs m
    SET contact_id = _contact_id
    WHERE m.workspace_id = _workspace_id
      AND (public.crm_normalize_phone(m.to_number) = _n OR public.crm_normalize_phone(m.from_number) = _n)
      AND (m.contact_id IS DISTINCT FROM _contact_id);
    GET DIAGNOSTICS _count = ROW_COUNT;
  END IF;

  INSERT INTO public.contact_identities (workspace_id, contact_id, identity_type, identity_value, raw_value)
  VALUES (_workspace_id, _contact_id, 'phone', COALESCE(_n, _identifier), _identifier)
  ON CONFLICT DO NOTHING;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_link_conversation_contact(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_link_conversation_contact(uuid, text, text, uuid) TO authenticated;