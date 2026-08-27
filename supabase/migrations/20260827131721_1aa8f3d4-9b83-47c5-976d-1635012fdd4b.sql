CREATE OR REPLACE FUNCTION public.crm_create_contact_from_conversation(
  _workspace_id uuid,
  _channel text,
  _identifier text,
  _full_name text,
  _email text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact uuid;
  _linked integer := 0;
  _n text;
  _name text;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _channel NOT IN ('whatsapp', 'sms') THEN
    RAISE EXCEPTION 'invalid channel';
  END IF;

  _name := NULLIF(btrim(coalesce(_full_name, '')), '');
  IF _name IS NULL THEN
    RAISE EXCEPTION 'full name required';
  END IF;
  IF _email IS NOT NULL AND public.crm_normalize_email(_email) IS NULL THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;

  _n := public.crm_normalize_phone(_identifier);

  -- Canonical create-or-match: dedupes by normalized email/phone via contact_identities.
  _contact := public.crm_upsert_contact(
    _workspace_id,
    _email := _email,
    _phone := COALESCE(_n, NULLIF(btrim(_identifier), '')),
    _full_name := _name,
    _source := 'messaging'
  );

  -- Attach matching conversation messages (same rules as crm_link_conversation_contact).
  IF _channel = 'whatsapp' THEN
    UPDATE public.whatsapp_messages m
    SET contact_id = _contact
    WHERE m.workspace_id = _workspace_id
      AND public.crm_normalize_phone(m.phone_number) = _n
      AND (m.contact_id IS DISTINCT FROM _contact);
    GET DIAGNOSTICS _linked = ROW_COUNT;
  ELSE
    UPDATE public.sms_logs m
    SET contact_id = _contact
    WHERE m.workspace_id = _workspace_id
      AND (public.crm_normalize_phone(m.to_number) = _n OR public.crm_normalize_phone(m.from_number) = _n)
      AND (m.contact_id IS DISTINCT FROM _contact);
    GET DIAGNOSTICS _linked = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('contact_id', _contact, 'linked_messages', _linked);
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_contact_from_conversation(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_create_contact_from_conversation(uuid, text, text, text, text) TO authenticated;