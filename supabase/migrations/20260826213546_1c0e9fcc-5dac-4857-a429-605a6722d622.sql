-- Phase 8: conversation -> canonical contact resolution

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact ON public.whatsapp_messages (contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_contact ON public.sms_logs (contact_id);

-- Finds the canonical contact for a normalised phone inside a workspace.
CREATE OR REPLACE FUNCTION public.crm_find_contact_by_phone(_workspace_id uuid, _phone text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.contacts c
  WHERE c.workspace_id = _workspace_id
    AND c.merged_into_id IS NULL
    AND (
      public.crm_normalize_phone(c.phone) = public.crm_normalize_phone(_phone)
      OR public.crm_normalize_phone(c.whatsapp_number) = public.crm_normalize_phone(_phone)
    )
    AND public.crm_normalize_phone(_phone) IS NOT NULL
  ORDER BY c.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.crm_find_contact_by_phone(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_find_contact_by_phone(uuid, text) TO authenticated, service_role;

-- Auto-link trigger: on insert, resolve contact_id from the counterparty number.
CREATE OR REPLACE FUNCTION public.crm_autolink_message_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _number text;
  _contact uuid;
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'whatsapp_messages' THEN
    _number := NEW.phone_number;
  ELSE
    _number := COALESCE(NEW.to_number, NEW.from_number);
  END IF;
  IF _number IS NULL THEN
    RETURN NEW;
  END IF;
  _contact := public.crm_find_contact_by_phone(NEW.workspace_id, _number);
  IF _contact IS NOT NULL THEN
    NEW.contact_id := _contact;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_autolink_contact ON public.whatsapp_messages;
CREATE TRIGGER trg_wa_autolink_contact
  BEFORE INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.crm_autolink_message_contact();

DROP TRIGGER IF EXISTS trg_sms_autolink_contact ON public.sms_logs;
CREATE TRIGGER trg_sms_autolink_contact
  BEFORE INSERT ON public.sms_logs
  FOR EACH ROW EXECUTE FUNCTION public.crm_autolink_message_contact();

-- Manual link action for the Unmatched queue: links every message in the
-- thread (normalised phone match) to the chosen contact and records the
-- identity so future resolution is instant. Workspace members only.
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

  INSERT INTO public.contact_identities (workspace_id, contact_id, identity_type, identity_value, source)
  VALUES (_workspace_id, _contact_id, 'phone', COALESCE(_n, _identifier), 'conversation_link')
  ON CONFLICT DO NOTHING;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_link_conversation_contact(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_link_conversation_contact(uuid, text, text, uuid) TO authenticated;

-- Bulk backfill: resolve any unlinked messages whose number matches a contact.
CREATE OR REPLACE FUNCTION public.crm_resolve_message_contacts(_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _c integer;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  UPDATE public.whatsapp_messages m
  SET contact_id = public.crm_find_contact_by_phone(m.workspace_id, m.phone_number)
  WHERE m.workspace_id = _workspace_id AND m.contact_id IS NULL;
  GET DIAGNOSTICS _c = ROW_COUNT;
  _count := _count + _c;

  UPDATE public.sms_logs m
  SET contact_id = public.crm_find_contact_by_phone(m.workspace_id, COALESCE(m.to_number, m.from_number))
  WHERE m.workspace_id = _workspace_id AND m.contact_id IS NULL;
  GET DIAGNOSTICS _c = ROW_COUNT;
  _count := _count + _c;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_resolve_message_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_resolve_message_contacts(uuid) TO authenticated;