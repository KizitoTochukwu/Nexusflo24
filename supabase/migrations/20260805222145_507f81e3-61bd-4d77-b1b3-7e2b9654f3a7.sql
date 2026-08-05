-- PIPELINES
CREATE TABLE public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipelines TO authenticated;
GRANT ALL ON public.crm_pipelines TO service_role;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipelines_select" ON public.crm_pipelines FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pipelines_insert" ON public.crm_pipelines FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pipelines_update" ON public.crm_pipelines FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pipelines_delete" ON public.crm_pipelines FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_crm_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_crm_pipelines_ws ON public.crm_pipelines(workspace_id, position);

-- STAGES
CREATE TABLE public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  stage_type TEXT NOT NULL DEFAULT 'open',
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipeline_stages TO authenticated;
GRANT ALL ON public.crm_pipeline_stages TO service_role;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_select" ON public.crm_pipeline_stages FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "stages_insert" ON public.crm_pipeline_stages FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "stages_update" ON public.crm_pipeline_stages FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "stages_delete" ON public.crm_pipeline_stages FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_crm_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_crm_stages_pipeline ON public.crm_pipeline_stages(pipeline_id, position);

-- DEALS
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'open',
  probability INTEGER,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  lost_reason TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  owner_user_id UUID,
  source TEXT,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_select" ON public.crm_deals FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "deals_insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "deals_update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "deals_delete" ON public.crm_deals FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_crm_deals_ws ON public.crm_deals(workspace_id, status);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage_id, position);
CREATE INDEX idx_crm_deals_contact ON public.crm_deals(contact_id);
CREATE INDEX idx_crm_deals_company ON public.crm_deals(company_id);

-- Ensure a default pipeline + stages exist for a workspace
CREATE OR REPLACE FUNCTION public.ensure_default_pipeline(_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _pid FROM public.crm_pipelines
  WHERE workspace_id = _workspace_id
  ORDER BY is_default DESC, position ASC, created_at ASC
  LIMIT 1;

  IF _pid IS NOT NULL THEN
    RETURN _pid;
  END IF;

  INSERT INTO public.crm_pipelines (workspace_id, name, description, is_default, created_by)
  VALUES (_workspace_id, 'Sales Pipeline', 'Default sales pipeline', true, auth.uid())
  RETURNING id INTO _pid;

  INSERT INTO public.crm_pipeline_stages (workspace_id, pipeline_id, name, position, probability, stage_type, color) VALUES
    (_workspace_id, _pid, 'New', 0, 10, 'open', '#64748B'),
    (_workspace_id, _pid, 'Qualified', 1, 25, 'open', '#3B82F6'),
    (_workspace_id, _pid, 'Proposal', 2, 50, 'open', '#6366F1'),
    (_workspace_id, _pid, 'Negotiation', 3, 75, 'open', '#C9A227'),
    (_workspace_id, _pid, 'Won', 4, 100, 'won', '#10B981'),
    (_workspace_id, _pid, 'Lost', 5, 0, 'lost', '#EF4444');

  RETURN _pid;
END;
$$;