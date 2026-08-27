-- ============ AI CLIENT FINDER — PHASE 1 FOUNDATION ============

CREATE TABLE public.prospecting_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  website_url text,
  short_description text,
  value_proposition text,
  customer_problem text,
  key_benefits text[] NOT NULL DEFAULT '{}',
  pricing_model text,
  typical_contract_value numeric,
  currency text NOT NULL DEFAULT 'GBP',
  customer_examples text,
  proof_points text,
  competitors text[] NOT NULL DEFAULT '{}',
  countries_served text[] NOT NULL DEFAULT '{}',
  call_to_action text,
  booking_url text,
  notes text,
  website_analysis_status text NOT NULL DEFAULT 'not_started',
  website_analysis_summary text,
  website_analysis_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  website_analysed_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ideal_customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.prospecting_offers(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  countries text[] NOT NULL DEFAULT '{}',
  regions text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  sub_industries text[] NOT NULL DEFAULT '{}',
  company_sizes text[] NOT NULL DEFAULT '{}',
  revenue_min numeric,
  revenue_max numeric,
  business_types text[] NOT NULL DEFAULT '{}',
  technologies text[] NOT NULL DEFAULT '{}',
  growth_stages text[] NOT NULL DEFAULT '{}',
  buying_signals text[] NOT NULL DEFAULT '{}',
  excluded_industries text[] NOT NULL DEFAULT '{}',
  excluded_companies text[] NOT NULL DEFAULT '{}',
  job_functions text[] NOT NULL DEFAULT '{}',
  job_titles text[] NOT NULL DEFAULT '{}',
  seniority_levels text[] NOT NULL DEFAULT '{}',
  pain_points text[] NOT NULL DEFAULT '{}',
  disqualifiers text[] NOT NULL DEFAULT '{}',
  required_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  optional_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_rationale text,
  approval_status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.icp_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  icp_id uuid NOT NULL REFERENCES public.ideal_customer_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_source text NOT NULL DEFAULT 'user',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (icp_id, version)
);

CREATE TABLE public.prospect_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  icp_id uuid REFERENCES public.ideal_customer_profiles(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.prospecting_offers(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospect_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.prospect_lists(id) ON DELETE SET NULL,
  icp_id uuid REFERENCES public.ideal_customer_profiles(id) ON DELETE SET NULL,
  crm_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  domain text,
  website_url text,
  industry text,
  sub_industry text,
  country text,
  region text,
  city text,
  employee_range text,
  employee_count integer,
  revenue_estimate numeric,
  company_type text,
  technologies text[] NOT NULL DEFAULT '{}',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  fit_score integer,
  fit_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  fit_explanation text,
  data_source text NOT NULL DEFAULT 'csv_import',
  source_reference text,
  data_freshness_at timestamptz,
  status text NOT NULL DEFAULT 'discovered',
  excluded_reason text,
  reported_issue text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  crm_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  first_name text,
  last_name text,
  job_title text,
  seniority text,
  department text,
  country text,
  linkedin_url text,
  email text,
  email_status text NOT NULL DEFAULT 'not_checked',
  email_verified_at timestamptz,
  email_confidence numeric,
  phone text,
  data_source text NOT NULL DEFAULT 'csv_import',
  source_reference text,
  data_freshness_at timestamptz,
  status text NOT NULL DEFAULT 'discovered',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  do_not_contact boolean NOT NULL DEFAULT false,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospect_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_url text,
  source_title text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  result_status text NOT NULL DEFAULT 'ok',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospect_research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.prospecting_offers(id) ON DELETE SET NULL,
  finding text NOT NULL,
  source_url text,
  source_title text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric,
  relevance text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  provider text NOT NULL,
  result text NOT NULL,
  confidence numeric,
  checked_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospecting_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  capability text NOT NULL,
  scope text NOT NULL DEFAULT 'platform',
  status text NOT NULL DEFAULT 'not_configured',
  secret_name text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospecting_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operation text NOT NULL,
  provider text,
  model text,
  prompt_version text,
  related_table text,
  related_id uuid,
  units integer NOT NULL DEFAULT 1,
  tokens integer,
  status text NOT NULL DEFAULT 'ok',
  error_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospecting_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospecting_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  progress integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, idempotency_key)
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideal_customer_profiles TO authenticated;
GRANT SELECT, INSERT ON public.icp_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_contacts TO authenticated;
GRANT SELECT ON public.prospect_sources TO authenticated;
GRANT SELECT ON public.prospect_research_findings TO authenticated;
GRANT SELECT ON public.email_verifications TO authenticated;
GRANT SELECT ON public.prospecting_provider_connections TO authenticated;
GRANT SELECT ON public.prospecting_usage_events TO authenticated;
GRANT SELECT ON public.prospecting_audit_events TO authenticated;
GRANT SELECT ON public.prospecting_jobs TO authenticated;

GRANT ALL ON public.prospecting_offers TO service_role;
GRANT ALL ON public.ideal_customer_profiles TO service_role;
GRANT ALL ON public.icp_versions TO service_role;
GRANT ALL ON public.prospect_lists TO service_role;
GRANT ALL ON public.prospect_companies TO service_role;
GRANT ALL ON public.prospect_contacts TO service_role;
GRANT ALL ON public.prospect_sources TO service_role;
GRANT ALL ON public.prospect_research_findings TO service_role;
GRANT ALL ON public.email_verifications TO service_role;
GRANT ALL ON public.prospecting_provider_connections TO service_role;
GRANT ALL ON public.prospecting_usage_events TO service_role;
GRANT ALL ON public.prospecting_audit_events TO service_role;
GRANT ALL ON public.prospecting_jobs TO service_role;

-- ============ RLS ============
ALTER TABLE public.prospecting_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideal_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icp_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_member_all" ON public.prospecting_offers FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "icp_member_all" ON public.ideal_customer_profiles FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "icp_versions_member_read" ON public.icp_versions FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "icp_versions_member_insert" ON public.icp_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "lists_member_all" ON public.prospect_lists FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "pcompanies_member_all" ON public.prospect_companies FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "pcontacts_member_all" ON public.prospect_contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "psources_member_read" ON public.prospect_sources FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pfindings_member_read" ON public.prospect_research_findings FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "everify_member_read" ON public.email_verifications FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pusage_member_read" ON public.prospecting_usage_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "paudit_member_read" ON public.prospecting_audit_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pjobs_member_read" ON public.prospecting_jobs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "pproviders_read" ON public.prospecting_provider_connections FOR SELECT TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
    OR (workspace_id IS NULL AND public.is_platform_staff(auth.uid()))
  );

-- ============ INDEXES ============
CREATE INDEX idx_prospecting_offers_ws ON public.prospecting_offers(workspace_id, status);
CREATE INDEX idx_icp_ws ON public.ideal_customer_profiles(workspace_id, approval_status);
CREATE INDEX idx_icp_offer ON public.ideal_customer_profiles(offer_id);
CREATE INDEX idx_plists_ws ON public.prospect_lists(workspace_id);
CREATE INDEX idx_pcompanies_ws_status ON public.prospect_companies(workspace_id, status);
CREATE INDEX idx_pcompanies_domain ON public.prospect_companies(workspace_id, lower(domain));
CREATE INDEX idx_pcompanies_list ON public.prospect_companies(list_id);
CREATE INDEX idx_pcontacts_ws_status ON public.prospect_contacts(workspace_id, status);
CREATE INDEX idx_pcontacts_email ON public.prospect_contacts(workspace_id, lower(email));
CREATE INDEX idx_pcontacts_company ON public.prospect_contacts(company_id);
CREATE INDEX idx_psources_company ON public.prospect_sources(company_id);
CREATE INDEX idx_pfindings_company ON public.prospect_research_findings(company_id);
CREATE INDEX idx_everify_contact ON public.email_verifications(contact_id);
CREATE INDEX idx_pusage_ws_created ON public.prospecting_usage_events(workspace_id, created_at DESC);
CREATE INDEX idx_paudit_ws_created ON public.prospecting_audit_events(workspace_id, created_at DESC);
CREATE INDEX idx_pjobs_status ON public.prospecting_jobs(status, next_retry_at);

CREATE UNIQUE INDEX uq_pcompanies_ws_domain ON public.prospect_companies(workspace_id, lower(domain))
  WHERE domain IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX uq_pcontacts_ws_email ON public.prospect_contacts(workspace_id, lower(email))
  WHERE email IS NOT NULL AND archived_at IS NULL;

-- ============ updated_at TRIGGERS ============
CREATE TRIGGER trg_prospecting_offers_updated BEFORE UPDATE ON public.prospecting_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_icp_updated BEFORE UPDATE ON public.ideal_customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plists_updated BEFORE UPDATE ON public.prospect_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pcompanies_updated BEFORE UPDATE ON public.prospect_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pcontacts_updated BEFORE UPDATE ON public.prospect_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pproviders_updated BEFORE UPDATE ON public.prospecting_provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pjobs_updated BEFORE UPDATE ON public.prospecting_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();