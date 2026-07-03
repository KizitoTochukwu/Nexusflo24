CREATE TABLE IF NOT EXISTS public.roi_calculator_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  contact_id uuid null,
  full_name text not null,
  email text not null,
  phone text,
  business_name text,
  business_type text,
  preferred_contact_method text,
  currency text not null default 'GBP',
  leads_per_month numeric not null default 0,
  average_customer_value numeric not null default 0,
  conversion_rate numeric not null default 0,
  missed_follow_up_percentage numeric not null default 0,
  manual_follow_up_hours numeric not null default 0,
  staff_cost_per_hour numeric not null default 0,
  monthly_software_cost numeric not null default 0,
  estimated_current_customers numeric not null default 0,
  estimated_current_revenue numeric not null default 0,
  estimated_missed_leads numeric not null default 0,
  estimated_recoverable_customers numeric not null default 0,
  estimated_recoverable_revenue numeric not null default 0,
  estimated_manual_admin_cost numeric not null default 0,
  estimated_monthly_opportunity numeric not null default 0,
  estimated_annual_opportunity numeric not null default 0,
  recommendation text,
  lead_status text default 'new',
  consent boolean not null default false,
  source text default 'roi_savings_calculator',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT INSERT ON public.roi_calculator_submissions TO anon, authenticated;
GRANT SELECT, UPDATE ON public.roi_calculator_submissions TO authenticated;
GRANT ALL ON public.roi_calculator_submissions TO service_role;

ALTER TABLE public.roi_calculator_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert ROI calculator submissions"
  ON public.roi_calculator_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Workspace members can view their ROI submissions"
  ON public.roi_calculator_submissions FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workspace admins can update ROI submissions"
  ON public.roi_calculator_submissions FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete ROI submissions"
  ON public.roi_calculator_submissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_roi_email ON public.roi_calculator_submissions (lower(email));
CREATE INDEX IF NOT EXISTS idx_roi_workspace ON public.roi_calculator_submissions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_roi_created ON public.roi_calculator_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_lead_status ON public.roi_calculator_submissions (lead_status);
CREATE INDEX IF NOT EXISTS idx_roi_monthly_opp ON public.roi_calculator_submissions (estimated_monthly_opportunity DESC);

CREATE TRIGGER update_roi_calculator_submissions_updated_at
  BEFORE UPDATE ON public.roi_calculator_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();