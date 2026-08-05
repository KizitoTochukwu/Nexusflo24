CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  owner_user_id UUID,
  name TEXT NOT NULL,
  domain TEXT,
  website TEXT,
  industry TEXT,
  size_band TEXT,
  annual_revenue NUMERIC,
  phone TEXT,
  email TEXT,
  linkedin_url TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
  last_activity_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_workspace ON public.companies(workspace_id, created_at DESC);
CREATE INDEX idx_companies_name ON public.companies(workspace_id, lower(name));
CREATE UNIQUE INDEX uq_companies_domain ON public.companies(workspace_id, lower(domain)) WHERE domain IS NOT NULL AND domain <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace companies" ON public.companies
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create workspace companies" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace companies" ON public.companies
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can delete workspace companies" ON public.companies
  FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id)
  REFERENCES public.companies(id) ON DELETE SET NULL;