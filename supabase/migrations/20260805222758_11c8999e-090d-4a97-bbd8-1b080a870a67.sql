CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  task_type text NOT NULL DEFAULT 'todo',
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace crm_tasks" ON public.crm_tasks FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace crm_tasks" ON public.crm_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace crm_tasks" ON public.crm_tasks FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace crm_tasks" ON public.crm_tasks FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_crm_tasks_ws_due ON public.crm_tasks (workspace_id, due_date);
CREATE INDEX idx_crm_tasks_ws_status ON public.crm_tasks (workspace_id, status);
CREATE INDEX idx_crm_tasks_contact ON public.crm_tasks (contact_id);
CREATE INDEX idx_crm_tasks_company ON public.crm_tasks (company_id);
CREATE INDEX idx_crm_tasks_deal ON public.crm_tasks (deal_id);

CREATE TRIGGER trg_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.convert_lead_to_contact(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      full_name = COALESCE(NULLIF(full_name, ''), _lead.name),
      email = COALESCE(NULLIF(email, ''), _lead.email),
      phone = COALESCE(NULLIF(phone, ''), _lead.phone),
      score = GREATEST(score, COALESCE(_lead.score, 0)),
      source = COALESCE(source, _lead.source),
      updated_at = now()
    WHERE id = _contact_id;
    RETURN _contact_id;
  END IF;

  INSERT INTO public.contacts (
    workspace_id, created_by, owner_user_id, origin_lead_id, full_name,
    first_name, last_name, email, phone, score, source, lifecycle_stage, lead_status
  ) VALUES (
    _lead.workspace_id, auth.uid(), COALESCE(_lead.assigned_owner_id, auth.uid()), _lead.id, _lead.name,
    NULLIF(split_part(COALESCE(_lead.name, ''), ' ', 1), ''),
    NULLIF(substr(COALESCE(_lead.name, ''), length(split_part(COALESCE(_lead.name, ''), ' ', 1)) + 2), ''),
    _lead.email, _lead.phone, COALESCE(_lead.score, 0), _lead.source, 'lead', _lead.status
  )
  RETURNING id INTO _contact_id;

  RETURN _contact_id;
END;
$$;