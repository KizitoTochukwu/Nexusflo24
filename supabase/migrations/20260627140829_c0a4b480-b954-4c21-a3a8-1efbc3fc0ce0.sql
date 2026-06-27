
-- ============ NexusIntel tables ============

CREATE TABLE public.nexusintel_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  website_url text NOT NULL,
  industry text,
  location text,
  size text,
  services text,
  summary text,
  business_model text,
  target_customers text,
  status text NOT NULL DEFAULT 'New Research',
  lead_score integer,
  urgency text,
  recommended_offer text,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_companies TO authenticated;
GRANT ALL ON public.nexusintel_companies TO service_role;
ALTER TABLE public.nexusintel_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_companies_ws_member_all" ON public.nexusintel_companies
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER ni_companies_updated_at BEFORE UPDATE ON public.nexusintel_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nexusintel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.nexusintel_companies(id) ON DELETE CASCADE,
  report_title text,
  analysis_depth text,
  user_offer text,
  report_json jsonb NOT NULL,
  crm_deal_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_reports TO authenticated;
GRANT ALL ON public.nexusintel_reports TO service_role;
ALTER TABLE public.nexusintel_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_reports_ws_member_all" ON public.nexusintel_reports
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.nexusintel_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.nexusintel_companies(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_notes TO authenticated;
GRANT ALL ON public.nexusintel_notes TO service_role;
ALTER TABLE public.nexusintel_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_notes_ws_member_all" ON public.nexusintel_notes
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.nexusintel_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.nexusintel_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_tasks TO authenticated;
GRANT ALL ON public.nexusintel_tasks TO service_role;
ALTER TABLE public.nexusintel_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_tasks_ws_member_all" ON public.nexusintel_tasks
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.nexusintel_outreach_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.nexusintel_companies(id) ON DELETE CASCADE,
  channel text NOT NULL,
  message text,
  status text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_outreach_history TO authenticated;
GRANT ALL ON public.nexusintel_outreach_history TO service_role;
ALTER TABLE public.nexusintel_outreach_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_outreach_ws_member_all" ON public.nexusintel_outreach_history
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.nexusintel_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_integrations TO authenticated;
GRANT ALL ON public.nexusintel_integrations TO service_role;
ALTER TABLE public.nexusintel_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_integrations_ws_member_all" ON public.nexusintel_integrations
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER ni_integrations_updated_at BEFORE UPDATE ON public.nexusintel_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nexusintel_usage (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  monthly_report_limit integer NOT NULL DEFAULT 5,
  reports_used integer NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexusintel_usage TO authenticated;
GRANT ALL ON public.nexusintel_usage TO service_role;
ALTER TABLE public.nexusintel_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ni_usage_ws_member_all" ON public.nexusintel_usage
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER ni_usage_updated_at BEFORE UPDATE ON public.nexusintel_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
