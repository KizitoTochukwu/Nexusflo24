CREATE OR REPLACE FUNCTION public.convert_lead_to_contact(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _lead public.leads%ROWTYPE;
  _contact_id uuid;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF _lead.id IS NULL THEN RETURN NULL; END IF;
  IF NOT public.is_workspace_member(auth.uid(), _lead.workspace_id) THEN RETURN NULL; END IF;

  SELECT id INTO _contact_id FROM public.contacts
  WHERE workspace_id = _lead.workspace_id
    AND archived_at IS NULL
    AND (
      (_lead.email IS NOT NULL AND _lead.email <> '' AND lower(email) = lower(_lead.email))
      OR (_lead.phone IS NOT NULL AND _lead.phone <> '' AND phone = _lead.phone)
      OR origin_lead_id = _lead.id
    )
  LIMIT 1;

  IF _contact_id IS NOT NULL THEN
    UPDATE public.contacts SET
      origin_lead_id = COALESCE(origin_lead_id, _lead.id),
      full_name = COALESCE(NULLIF(full_name, ''), _lead.full_name),
      email = COALESCE(NULLIF(email, ''), _lead.email),
      phone = COALESCE(NULLIF(phone, ''), _lead.phone),
      score = GREATEST(score, COALESCE(_lead.score, 0)),
      source = COALESCE(source, _lead.source),
      updated_at = now()
    WHERE id = _contact_id;

    UPDATE public.leads SET contact_id = COALESCE(contact_id, _contact_id), updated_at = now()
    WHERE id = _lead.id;

    RETURN _contact_id;
  END IF;

  INSERT INTO public.contacts (
    workspace_id, created_by, owner_user_id, origin_lead_id, full_name,
    first_name, last_name, email, phone, score, source, lifecycle_stage, lead_status
  ) VALUES (
    _lead.workspace_id, auth.uid(), COALESCE(_lead.assigned_owner_id, auth.uid()), _lead.id, _lead.full_name,
    NULLIF(split_part(COALESCE(_lead.full_name, ''), ' ', 1), ''),
    NULLIF(substr(COALESCE(_lead.full_name, ''), length(split_part(COALESCE(_lead.full_name, ''), ' ', 1)) + 2), ''),
    _lead.email, _lead.phone, COALESCE(_lead.score, 0), _lead.source, 'lead', _lead.status
  )
  RETURNING id INTO _contact_id;

  UPDATE public.leads SET contact_id = COALESCE(contact_id, _contact_id), updated_at = now()
  WHERE id = _lead.id;

  RETURN _contact_id;
END;
$function$;