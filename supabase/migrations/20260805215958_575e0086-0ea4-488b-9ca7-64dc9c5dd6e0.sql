-- ============ CONTACTS ============
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  owner_user_id UUID,
  origin_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  company_id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  job_title TEXT,
  company_name TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
  lead_status TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  consent_updated_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  notes TEXT,
  last_activity_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read contacts" ON public.contacts
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE UNIQUE INDEX idx_contacts_ws_email_unique
  ON public.contacts (workspace_id, lower(email))
  WHERE email IS NOT NULL AND email <> '' AND archived_at IS NULL;
CREATE UNIQUE INDEX idx_contacts_ws_phone_unique
  ON public.contacts (workspace_id, phone)
  WHERE phone IS NOT NULL AND phone <> '' AND archived_at IS NULL;
CREATE INDEX idx_contacts_ws_created ON public.contacts (workspace_id, created_at DESC);
CREATE INDEX idx_contacts_ws_stage ON public.contacts (workspace_id, lifecycle_stage);
CREATE INDEX idx_contacts_ws_owner ON public.contacts (workspace_id, owner_user_id);
CREATE INDEX idx_contacts_ws_company ON public.contacts (workspace_id, company_id);
CREATE INDEX idx_contacts_tags ON public.contacts USING GIN (tags);
CREATE INDEX idx_contacts_origin_lead ON public.contacts (origin_lead_id);

CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep full_name in sync with first/last when not explicitly provided
CREATE OR REPLACE FUNCTION public.crm_sync_contact_name()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.full_name IS NULL OR btrim(NEW.full_name) = '' THEN
    NEW.full_name := NULLIF(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
  END IF;
  IF NEW.email IS NOT NULL THEN NEW.email := lower(btrim(NEW.email)); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contacts_sync_name BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_sync_contact_name();

-- ============ SAVED VIEWS ============
CREATE TABLE public.crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'contact',
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_saved_views TO authenticated;
GRANT ALL ON public.crm_saved_views TO service_role;
ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read shared or own views" ON public.crm_saved_views
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND (visibility = 'shared' OR user_id = auth.uid()));
CREATE POLICY "Insert own views" ON public.crm_saved_views
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());
CREATE POLICY "Update own views" ON public.crm_saved_views
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own views" ON public.crm_saved_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));

CREATE INDEX idx_crm_saved_views_ws_type ON public.crm_saved_views (workspace_id, record_type);
CREATE TRIGGER trg_crm_saved_views_updated_at BEFORE UPDATE ON public.crm_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTES ============
CREATE TABLE public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  author_user_id UUID,
  body TEXT NOT NULL,
  body_html TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  edited_at TIMESTAMPTZ,
  edit_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_notes TO authenticated;
GRANT ALL ON public.crm_notes TO service_role;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read notes" ON public.crm_notes
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert notes" ON public.crm_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Authors update notes" ON public.crm_notes
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Authors delete notes" ON public.crm_notes
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));

CREATE INDEX idx_crm_notes_record ON public.crm_notes (workspace_id, record_type, record_id, created_at DESC);
CREATE TRIGGER trg_crm_notes_updated_at BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FILES ============
CREATE TABLE public.crm_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  uploaded_by UUID,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_files TO authenticated;
GRANT ALL ON public.crm_files TO service_role;
ALTER TABLE public.crm_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read files" ON public.crm_files
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert files" ON public.crm_files
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update files" ON public.crm_files
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Uploaders delete files" ON public.crm_files
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));

CREATE INDEX idx_crm_files_record ON public.crm_files (workspace_id, record_type, record_id, created_at DESC);
CREATE TRIGGER trg_crm_files_updated_at BEFORE UPDATE ON public.crm_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ UNIFIED ACTIVITIES ============
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  actor_user_id UUID,
  actor_label TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  status TEXT,
  related_type TEXT,
  related_id UUID,
  external_event_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read activities" ON public.crm_activities
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert activities" ON public.crm_activities
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_crm_activities_record ON public.crm_activities (workspace_id, record_type, record_id, occurred_at DESC);
CREATE INDEX idx_crm_activities_type ON public.crm_activities (workspace_id, activity_type, occurred_at DESC);
CREATE UNIQUE INDEX idx_crm_activities_dedup
  ON public.crm_activities (workspace_id, source, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- ============ CUSTOM FIELDS ============
CREATE TABLE public.crm_custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_value JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, record_type, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_field_defs TO authenticated;
GRANT ALL ON public.crm_custom_field_defs TO service_role;
ALTER TABLE public.crm_custom_field_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read field defs" ON public.crm_custom_field_defs
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins manage field defs" ON public.crm_custom_field_defs
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE INDEX idx_crm_field_defs_ws_type ON public.crm_custom_field_defs (workspace_id, record_type, sort_order);
CREATE TRIGGER trg_crm_field_defs_updated_at BEFORE UPDATE ON public.crm_custom_field_defs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.crm_custom_field_defs(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_id, record_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_field_values TO authenticated;
GRANT ALL ON public.crm_custom_field_values TO service_role;
ALTER TABLE public.crm_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage field values" ON public.crm_custom_field_values
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_crm_field_values_record ON public.crm_custom_field_values (workspace_id, record_type, record_id);
CREATE TRIGGER trg_crm_field_values_updated_at BEFORE UPDATE ON public.crm_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TAGS ============
CREATE TABLE public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#C9A227',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tags TO authenticated;
GRANT ALL ON public.crm_tags TO service_role;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read tags" ON public.crm_tags
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert tags" ON public.crm_tags
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins update tags" ON public.crm_tags
  FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins delete tags" ON public.crm_tags
  FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_crm_tags_updated_at BEFORE UPDATE ON public.crm_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDIT LOG ============
CREATE TABLE public.crm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  actor_user_id UUID,
  actor_label TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.crm_audit_log TO authenticated;
GRANT ALL ON public.crm_audit_log TO service_role;
ALTER TABLE public.crm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log" ON public.crm_audit_log
  FOR SELECT TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Members insert audit log" ON public.crm_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_crm_audit_record ON public.crm_audit_log (workspace_id, record_type, record_id, created_at DESC);

-- ============ BACKFILL CONTACTS FROM EXISTING LEADS ============
INSERT INTO public.contacts (
  workspace_id, created_by, owner_user_id, origin_lead_id, full_name, email, phone,
  whatsapp_number, lifecycle_stage, lead_status, score, source, consent_status,
  tags, notes, last_activity_at, created_at
)
SELECT DISTINCT ON (l.workspace_id, lower(coalesce(nullif(l.email,''), l.id::text)))
  l.workspace_id,
  l.user_id,
  COALESCE(l.assigned_owner_id, l.user_id),
  l.id,
  l.full_name,
  NULLIF(lower(btrim(l.email)), ''),
  NULLIF(btrim(l.phone), ''),
  NULLIF(btrim(l.phone), ''),
  CASE
    WHEN l.pipeline_stage IN ('customer','won') THEN 'customer'
    WHEN l.pipeline_stage IN ('qualified','demo_booked','proposal_sent') THEN 'sales_qualified_lead'
    WHEN l.pipeline_stage IN ('engaged','contacted') THEN 'marketing_qualified_lead'
    ELSE 'lead'
  END,
  l.status,
  COALESCE(l.score, 0),
  l.source,
  CASE WHEN l.sms_opt_out THEN 'opted_out' WHEN l.sms_consent THEN 'opted_in' ELSE 'unknown' END,
  COALESCE(l.tags, '{}'),
  l.notes,
  l.last_activity_at,
  l.created_at
FROM public.leads l
WHERE l.pipeline_stage IN ('qualified','demo_booked','proposal_sent','won','customer')
ORDER BY l.workspace_id, lower(coalesce(nullif(l.email,''), l.id::text)), l.created_at ASC
ON CONFLICT DO NOTHING;

-- Seed the tag registry from existing lead tags
INSERT INTO public.crm_tags (workspace_id, name)
SELECT DISTINCT l.workspace_id, t
FROM public.leads l, unnest(l.tags) AS t
WHERE btrim(t) <> ''
ON CONFLICT DO NOTHING;