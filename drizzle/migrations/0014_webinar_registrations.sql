CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  business_name TEXT,
  business_type TEXT,
  whatsapp_enquiry_volume TEXT,
  webinar_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT,
  consent_text TEXT,
  webinar_consent_at TIMESTAMPTZ,
  marketing_consent_at TIMESTAMPTZ,
  source_url TEXT,
  landing_page_url TEXT,
  campaign TEXT,
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  submission_count INTEGER NOT NULL DEFAULT 1,
  enrolled_at TIMESTAMPTZ,
  last_submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webinar_registrations_ws_email_idx
  ON public.webinar_registrations (workspace_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS webinar_registrations_ws_created_idx
  ON public.webinar_registrations (workspace_id, created_at DESC);

GRANT SELECT ON public.webinar_registrations TO authenticated;
GRANT ALL ON public.webinar_registrations TO service_role;

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read webinar registrations"
  ON public.webinar_registrations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_webinar_registrations_updated_at
  BEFORE UPDATE ON public.webinar_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();