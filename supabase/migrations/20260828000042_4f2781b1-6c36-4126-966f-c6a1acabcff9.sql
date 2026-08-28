-- Connected sending mailboxes -------------------------------------------------
CREATE TABLE public.prospecting_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid,
  provider text NOT NULL CHECK (provider IN ('google','microsoft','platform_email')),
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error','pending')),
  daily_limit integer NOT NULL DEFAULT 50,
  last_error text,
  last_checked_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, email)
);

GRANT SELECT (id, workspace_id, created_by, provider, email, display_name, status,
  daily_limit, last_error, last_checked_at, connected_at, token_expires_at, scopes,
  archived_at, created_at, updated_at) ON public.prospecting_mailboxes TO authenticated;
GRANT ALL ON public.prospecting_mailboxes TO service_role;

ALTER TABLE public.prospecting_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read workspace mailboxes"
  ON public.prospecting_mailboxes FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_prospecting_mailboxes_workspace ON public.prospecting_mailboxes (workspace_id, status);

CREATE TRIGGER trg_prospecting_mailboxes_updated
  BEFORE UPDATE ON public.prospecting_mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prospect replies -------------------------------------------------------------
CREATE TABLE public.prospecting_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.prospecting_campaigns(id) ON DELETE SET NULL,
  enrolment_id uuid REFERENCES public.prospecting_enrolments(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
  outbound_email_id uuid REFERENCES public.prospecting_outbound_emails(id) ON DELETE SET NULL,
  mailbox_id uuid REFERENCES public.prospecting_mailboxes(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','mailbox')),
  from_email text NOT NULL,
  subject text,
  body_text text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now(),
  classification text,
  classification_confidence numeric,
  classification_reason text,
  corrected_classification text,
  corrected_by uuid,
  corrected_at timestamptz,
  handled boolean NOT NULL DEFAULT false,
  crm_synced_at timestamptz,
  crm_contact_id uuid,
  crm_deal_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_replies TO authenticated;
GRANT ALL ON public.prospecting_replies TO service_role;

ALTER TABLE public.prospecting_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workspace replies"
  ON public.prospecting_replies FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_prospecting_replies_workspace ON public.prospecting_replies (workspace_id, received_at DESC);
CREATE INDEX idx_prospecting_replies_campaign ON public.prospecting_replies (campaign_id, received_at DESC);

CREATE TRIGGER trg_prospecting_replies_updated
  BEFORE UPDATE ON public.prospecting_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign CRM settings ---------------------------------------------------------
ALTER TABLE public.prospecting_campaigns
  ADD COLUMN IF NOT EXISTS mailbox_id uuid REFERENCES public.prospecting_mailboxes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_pipeline_id uuid,
  ADD COLUMN IF NOT EXISTS crm_stage_id uuid,
  ADD COLUMN IF NOT EXISTS create_crm_lead boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_url text;

-- Enrolment reply + CRM linkage --------------------------------------------------
ALTER TABLE public.prospecting_enrolments
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_classification text,
  ADD COLUMN IF NOT EXISTS crm_contact_id uuid,
  ADD COLUMN IF NOT EXISTS crm_company_id uuid,
  ADD COLUMN IF NOT EXISTS crm_deal_id uuid;