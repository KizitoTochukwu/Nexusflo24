-- ============ Phase 1: canonical contact identity ============

-- contacts: lifecycle/scoring/attribution/conversion
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS score_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_source_id text,
  ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversion_source text,
  ADD COLUMN IF NOT EXISTS conversion_reason text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz;

CREATE INDEX IF NOT EXISTS contacts_ws_email_idx ON public.contacts (workspace_id, lower(email));
CREATE INDEX IF NOT EXISTS contacts_ws_phone_idx ON public.contacts (workspace_id, phone);
CREATE INDEX IF NOT EXISTS contacts_merged_into_idx ON public.contacts (merged_into_id);

-- leads -> canonical contact
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_source_id text,
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS leads_contact_idx ON public.leads (contact_id);

-- form submissions -> canonical contact + processing status
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE INDEX IF NOT EXISTS form_submissions_contact_idx ON public.form_submissions (contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS form_submissions_idem_idx ON public.form_submissions (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- bookings already have contact_id; index it
CREATE INDEX IF NOT EXISTS bookings_contact_idx ON public.bookings (contact_id);

-- pipelines: active/archived
ALTER TABLE public.crm_pipelines
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- tasks: reminders, completion, automation provenance
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS source_workflow_id uuid,
  ADD COLUMN IF NOT EXISTS source_execution_id uuid,
  ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS crm_tasks_dedupe_idx ON public.crm_tasks (workspace_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- ============ contact_identities ============
CREATE TABLE IF NOT EXISTS public.contact_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  identity_type text NOT NULL,
  identity_value text NOT NULL,
  raw_value text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_identities_unique_idx
  ON public.contact_identities (workspace_id, identity_type, identity_value);
CREATE INDEX IF NOT EXISTS contact_identities_contact_idx ON public.contact_identities (contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_identities TO authenticated;
GRANT ALL ON public.contact_identities TO service_role;
ALTER TABLE public.contact_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage contact identities" ON public.contact_identities
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ contact_source_map ============
CREATE TABLE IF NOT EXISTS public.contact_source_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  source_record_id text NOT NULL,
  match_method text NOT NULL,
  match_confidence numeric NOT NULL DEFAULT 1,
  conflict_state text,
  migration_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_source_map_unique_idx
  ON public.contact_source_map (workspace_id, source_table, source_record_id);
CREATE INDEX IF NOT EXISTS contact_source_map_contact_idx ON public.contact_source_map (contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_source_map TO authenticated;
GRANT ALL ON public.contact_source_map TO service_role;
ALTER TABLE public.contact_source_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read source map" ON public.contact_source_map
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write source map" ON public.contact_source_map
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ contact_merge_log ============
CREATE TABLE IF NOT EXISTS public.contact_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  surviving_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  merged_contact_id uuid NOT NULL,
  merged_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  moved_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_merge_log_ws_idx ON public.contact_merge_log (workspace_id, created_at DESC);
GRANT SELECT, INSERT ON public.contact_merge_log TO authenticated;
GRANT ALL ON public.contact_merge_log TO service_role;
ALTER TABLE public.contact_merge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read merge log" ON public.contact_merge_log
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins write merge log" ON public.contact_merge_log
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- ============ contact_duplicate_candidates ============
CREATE TABLE IF NOT EXISTS public.contact_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  duplicate_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  match_reason text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  conflicting_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_dupe_pair_idx
  ON public.contact_duplicate_candidates (workspace_id, least(contact_id, duplicate_contact_id), greatest(contact_id, duplicate_contact_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_duplicate_candidates TO authenticated;
GRANT ALL ON public.contact_duplicate_candidates TO service_role;
ALTER TABLE public.contact_duplicate_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read duplicates" ON public.contact_duplicate_candidates
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins manage duplicates" ON public.contact_duplicate_candidates
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- ============ crm_deal_stage_history ============
CREATE TABLE IF NOT EXISTS public.crm_deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  from_stage_id uuid,
  to_stage_id uuid,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  changed_by uuid,
  change_source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_stage_history_deal_idx ON public.crm_deal_stage_history (deal_id, entered_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.crm_deal_stage_history TO authenticated;
GRANT ALL ON public.crm_deal_stage_history TO service_role;
ALTER TABLE public.crm_deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read deal stage history" ON public.crm_deal_stage_history
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write deal stage history" ON public.crm_deal_stage_history
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update deal stage history" ON public.crm_deal_stage_history
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ crm_reconciliation_runs ============
CREATE TABLE IF NOT EXISTS public.crm_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phase text NOT NULL,
  migration_version text NOT NULL,
  counts_before jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_count integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  ambiguous_count integer NOT NULL DEFAULT 0,
  unresolved_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reconciliation_ws_idx ON public.crm_reconciliation_runs (workspace_id, created_at DESC);
GRANT SELECT ON public.crm_reconciliation_runs TO authenticated;
GRANT ALL ON public.crm_reconciliation_runs TO service_role;
ALTER TABLE public.crm_reconciliation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reconciliation" ON public.crm_reconciliation_runs
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ updated_at triggers ============
DROP TRIGGER IF EXISTS set_updated_at_contact_identities ON public.contact_identities;
CREATE TRIGGER set_updated_at_contact_identities BEFORE UPDATE ON public.contact_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at_dupes ON public.contact_duplicate_candidates;
CREATE TRIGGER set_updated_at_dupes BEFORE UPDATE ON public.contact_duplicate_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ normalisation helpers ============
CREATE OR REPLACE FUNCTION public.crm_normalize_email(_email text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(lower(btrim(coalesce(_email, ''))), '')
$$;

CREATE OR REPLACE FUNCTION public.crm_normalize_phone(_phone text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE digits text; raw text;
BEGIN
  raw := btrim(coalesce(_phone, ''));
  IF raw = '' THEN RETURN NULL; END IF;
  digits := regexp_replace(raw, '[^0-9]', '', 'g');
  IF digits = '' THEN RETURN NULL; END IF;
  IF left(raw, 1) = '+' THEN RETURN '+' || digits; END IF;
  IF left(digits, 2) = '00' THEN RETURN '+' || substr(digits, 3); END IF;
  IF length(digits) < 7 THEN RETURN NULL; END IF;
  RETURN '+' || digits;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_normalize_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_normalize_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_normalize_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_normalize_phone(text) TO authenticated, service_role;

-- ============ canonical contact upsert ============
CREATE OR REPLACE FUNCTION public.crm_upsert_contact(
  _workspace_id uuid,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _external_source_id text DEFAULT NULL,
  _source text DEFAULT NULL,
  _attribution jsonb DEFAULT '{}'::jsonb,
  _source_table text DEFAULT NULL,
  _source_record_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := public.crm_normalize_email(_email);
  v_phone text := public.crm_normalize_phone(_phone);
  v_contact uuid;
  v_method text;
  v_now timestamptz := now();
BEGIN
  IF _workspace_id IS NULL THEN RAISE EXCEPTION 'workspace_id required'; END IF;
  IF v_email IS NULL AND v_phone IS NULL AND _external_source_id IS NULL THEN
    RAISE EXCEPTION 'at least one identifier required';
  END IF;

  IF _external_source_id IS NOT NULL THEN
    SELECT contact_id INTO v_contact FROM public.contact_identities
      WHERE workspace_id = _workspace_id AND identity_type = 'external' AND identity_value = _external_source_id;
    IF v_contact IS NOT NULL THEN v_method := 'external_id'; END IF;
  END IF;

  IF v_contact IS NULL AND v_email IS NOT NULL THEN
    SELECT contact_id INTO v_contact FROM public.contact_identities
      WHERE workspace_id = _workspace_id AND identity_type = 'email' AND identity_value = v_email;
    IF v_contact IS NULL THEN
      SELECT id INTO v_contact FROM public.contacts
        WHERE workspace_id = _workspace_id AND lower(email) = v_email AND merged_into_id IS NULL
        ORDER BY created_at LIMIT 1;
    END IF;
    IF v_contact IS NOT NULL THEN v_method := coalesce(v_method, 'email'); END IF;
  END IF;

  IF v_contact IS NULL AND v_phone IS NOT NULL THEN
    SELECT contact_id INTO v_contact FROM public.contact_identities
      WHERE workspace_id = _workspace_id AND identity_type = 'phone' AND identity_value = v_phone;
    IF v_contact IS NULL THEN
      SELECT id INTO v_contact FROM public.contacts
        WHERE workspace_id = _workspace_id
          AND public.crm_normalize_phone(coalesce(phone, whatsapp_number)) = v_phone
          AND merged_into_id IS NULL
        ORDER BY created_at LIMIT 1;
    END IF;
    IF v_contact IS NOT NULL THEN v_method := coalesce(v_method, 'phone'); END IF;
  END IF;

  IF v_contact IS NULL THEN
    INSERT INTO public.contacts (
      workspace_id, full_name, email, phone, source, external_source_id,
      first_touch, last_touch, first_touch_at, last_touch_at, last_activity_at
    ) VALUES (
      _workspace_id, NULLIF(btrim(coalesce(_full_name, '')), ''), v_email, v_phone, _source, _external_source_id,
      coalesce(_attribution, '{}'::jsonb), coalesce(_attribution, '{}'::jsonb), v_now, v_now, v_now
    ) RETURNING id INTO v_contact;
    v_method := 'created';
  ELSE
    UPDATE public.contacts SET
      full_name = coalesce(full_name, NULLIF(btrim(coalesce(_full_name, '')), '')),
      email = coalesce(email, v_email),
      phone = coalesce(phone, v_phone),
      source = coalesce(source, _source),
      external_source_id = coalesce(external_source_id, _external_source_id),
      last_touch = CASE WHEN coalesce(_attribution, '{}'::jsonb) = '{}'::jsonb THEN last_touch ELSE _attribution END,
      last_touch_at = v_now,
      first_touch_at = coalesce(first_touch_at, v_now),
      last_activity_at = v_now,
      updated_at = v_now
    WHERE id = v_contact;
  END IF;

  IF v_email IS NOT NULL THEN
    INSERT INTO public.contact_identities (workspace_id, contact_id, identity_type, identity_value, raw_value)
    VALUES (_workspace_id, v_contact, 'email', v_email, _email)
    ON CONFLICT (workspace_id, identity_type, identity_value) DO NOTHING;
  END IF;
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.contact_identities (workspace_id, contact_id, identity_type, identity_value, raw_value)
    VALUES (_workspace_id, v_contact, 'phone', v_phone, _phone)
    ON CONFLICT (workspace_id, identity_type, identity_value) DO NOTHING;
  END IF;
  IF _external_source_id IS NOT NULL THEN
    INSERT INTO public.contact_identities (workspace_id, contact_id, identity_type, identity_value, raw_value)
    VALUES (_workspace_id, v_contact, 'external', _external_source_id, _external_source_id)
    ON CONFLICT (workspace_id, identity_type, identity_value) DO NOTHING;
  END IF;

  IF _source_table IS NOT NULL AND _source_record_id IS NOT NULL THEN
    INSERT INTO public.contact_source_map (
      workspace_id, contact_id, source_table, source_record_id, match_method, match_confidence, migration_version
    ) VALUES (
      _workspace_id, v_contact, _source_table, _source_record_id, coalesce(v_method, 'unknown'),
      CASE WHEN v_method IN ('external_id', 'email') THEN 1 WHEN v_method = 'phone' THEN 0.9 ELSE 1 END,
      'phase1'
    ) ON CONFLICT (workspace_id, source_table, source_record_id) DO NOTHING;
  END IF;

  RETURN v_contact;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_upsert_contact(uuid, text, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_upsert_contact(uuid, text, text, text, text, text, jsonb, text, text) TO service_role;