
CREATE TABLE public.prospecting_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid,
  name text NOT NULL,
  offer_id uuid REFERENCES public.prospecting_offers(id) ON DELETE SET NULL,
  icp_id uuid REFERENCES public.ideal_customer_profiles(id) ON DELETE SET NULL,
  list_id uuid REFERENCES public.prospect_lists(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  from_name text,
  from_email text,
  reply_to text,
  timezone text NOT NULL DEFAULT 'Europe/London',
  send_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  send_window_start integer NOT NULL DEFAULT 9,
  send_window_end integer NOT NULL DEFAULT 17,
  daily_limit integer NOT NULL DEFAULT 50,
  min_spacing_seconds integer NOT NULL DEFAULT 90,
  max_spacing_seconds integer NOT NULL DEFAULT 600,
  approved_by uuid,
  approved_at timestamptz,
  launched_at timestamptz,
  paused_at timestamptz,
  paused_reason text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prospecting_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  delay_days integer NOT NULL DEFAULT 0,
  subject_template text NOT NULL DEFAULT '',
  body_template text NOT NULL DEFAULT '',
  ai_generated boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, step_number)
);

CREATE TABLE public.prospecting_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.prospect_contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.prospect_companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_approval',
  current_step integer NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);

CREATE TABLE public.prospecting_outbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  enrolment_id uuid NOT NULL REFERENCES public.prospecting_enrolments(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.prospecting_sequence_steps(id) ON DELETE SET NULL,
  step_number integer NOT NULL DEFAULT 1,
  idempotency_key text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE TABLE public.prospecting_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid,
  email text,
  domain text,
  reason text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX prospecting_suppressions_email_uq ON public.prospecting_suppressions (workspace_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX prospecting_suppressions_domain_uq ON public.prospecting_suppressions (workspace_id, lower(domain)) WHERE domain IS NOT NULL;
CREATE INDEX prospecting_campaigns_ws_idx ON public.prospecting_campaigns (workspace_id, status);
CREATE INDEX prospecting_enrolments_due_idx ON public.prospecting_enrolments (status, next_send_at);
CREATE INDEX prospecting_enrolments_campaign_idx ON public.prospecting_enrolments (campaign_id, status);
CREATE INDEX prospecting_outbound_due_idx ON public.prospecting_outbound_emails (status, scheduled_at);
CREATE INDEX prospecting_outbound_campaign_idx ON public.prospecting_outbound_emails (campaign_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_campaigns TO authenticated;
GRANT ALL ON public.prospecting_campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_sequence_steps TO authenticated;
GRANT ALL ON public.prospecting_sequence_steps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_enrolments TO authenticated;
GRANT ALL ON public.prospecting_enrolments TO service_role;
GRANT SELECT ON public.prospecting_outbound_emails TO authenticated;
GRANT ALL ON public.prospecting_outbound_emails TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_suppressions TO authenticated;
GRANT ALL ON public.prospecting_suppressions TO service_role;

ALTER TABLE public.prospecting_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_outbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage campaigns" ON public.prospecting_campaigns FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members manage sequence steps" ON public.prospecting_sequence_steps FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members manage enrolments" ON public.prospecting_enrolments FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members read outbound emails" ON public.prospecting_outbound_emails FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members manage suppressions" ON public.prospecting_suppressions FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER prospecting_campaigns_updated_at BEFORE UPDATE ON public.prospecting_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prospecting_sequence_steps_updated_at BEFORE UPDATE ON public.prospecting_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prospecting_enrolments_updated_at BEFORE UPDATE ON public.prospecting_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prospecting_outbound_emails_updated_at BEFORE UPDATE ON public.prospecting_outbound_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
