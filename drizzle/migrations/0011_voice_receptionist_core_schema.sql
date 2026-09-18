-- NexusFlo Voice — Milestone 2: additive data model (no existing tables changed)

CREATE TABLE public.voice_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','testing','active','paused','degraded','archived')),
  greeting text,
  persona text,
  voice_id text,
  language text NOT NULL DEFAULT 'en-GB',
  timezone text NOT NULL DEFAULT 'Europe/London',
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  runtime_prompt text,
  published_version integer,
  crm_pipeline_id uuid,
  crm_stage_id uuid,
  default_owner_user_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  recording_enabled boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_assistants_workspace ON public.voice_assistants(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_assistants TO authenticated;
GRANT ALL ON public.voice_assistants TO service_role;
ALTER TABLE public.voice_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice assistants" ON public.voice_assistants FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins insert voice assistants" ON public.voice_assistants FOR INSERT WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins update voice assistants" ON public.voice_assistants FOR UPDATE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins delete voice assistants" ON public.voice_assistants FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_voice_assistants_updated BEFORE UPDATE ON public.voice_assistants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_assistant_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES public.voice_assistants(id) ON DELETE CASCADE,
  version integer NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  runtime_prompt text,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assistant_id, version)
);
CREATE INDEX idx_voice_assistant_versions_workspace ON public.voice_assistant_versions(workspace_id);
GRANT SELECT ON public.voice_assistant_versions TO authenticated;
GRANT ALL ON public.voice_assistant_versions TO service_role;
ALTER TABLE public.voice_assistant_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view assistant versions" ON public.voice_assistant_versions FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.voice_assistants(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  provider text NOT NULL DEFAULT 'twilio',
  provider_sid text,
  country text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_status text NOT NULL DEFAULT 'not_configured' CHECK (webhook_status IN ('not_configured','configured','error')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','releasing','released')),
  forward_to_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, phone_number)
);
CREATE INDEX idx_voice_numbers_workspace ON public.voice_phone_numbers(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_phone_numbers TO authenticated;
GRANT ALL ON public.voice_phone_numbers TO service_role;
ALTER TABLE public.voice_phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice numbers" ON public.voice_phone_numbers FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins insert voice numbers" ON public.voice_phone_numbers FOR INSERT WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins update voice numbers" ON public.voice_phone_numbers FOR UPDATE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins delete voice numbers" ON public.voice_phone_numbers FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_voice_numbers_updated BEFORE UPDATE ON public.voice_phone_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.voice_assistants(id) ON DELETE SET NULL,
  assistant_version integer,
  phone_number_id uuid REFERENCES public.voice_phone_numbers(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'twilio',
  provider_call_id text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  from_number text,
  to_number text,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','in_progress','completed','failed','no_answer','busy','transferred','voicemail')),
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  billable_seconds integer NOT NULL DEFAULT 0,
  contact_id uuid,
  lead_id uuid,
  deal_id uuid,
  booking_id uuid,
  outcome text,
  intent text,
  sentiment text,
  summary text,
  extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_call_id)
);
CREATE INDEX idx_voice_calls_workspace_started ON public.voice_call_sessions(workspace_id, started_at DESC);
CREATE INDEX idx_voice_calls_contact ON public.voice_call_sessions(contact_id);
GRANT SELECT, UPDATE ON public.voice_call_sessions TO authenticated;
GRANT ALL ON public.voice_call_sessions TO service_role;
ALTER TABLE public.voice_call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice calls" ON public.voice_call_sessions FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update voice calls" ON public.voice_call_sessions FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_voice_calls_updated BEFORE UPDATE ON public.voice_call_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid NOT NULL REFERENCES public.voice_call_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  external_event_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_voice_call_events_external ON public.voice_call_events(call_session_id, external_event_id) WHERE external_event_id IS NOT NULL;
CREATE INDEX idx_voice_call_events_session ON public.voice_call_events(call_session_id, occurred_at);
GRANT SELECT ON public.voice_call_events TO authenticated;
GRANT ALL ON public.voice_call_events TO service_role;
ALTER TABLE public.voice_call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice call events" ON public.voice_call_events FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_call_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid NOT NULL REFERENCES public.voice_call_sessions(id) ON DELETE CASCADE,
  turn_index integer NOT NULL,
  speaker text NOT NULL CHECK (speaker IN ('caller','assistant','system','agent')),
  content text NOT NULL,
  started_offset_ms integer,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_session_id, turn_index)
);
CREATE INDEX idx_voice_transcripts_workspace ON public.voice_call_transcripts(workspace_id);
GRANT SELECT ON public.voice_call_transcripts TO authenticated;
GRANT ALL ON public.voice_call_transcripts TO service_role;
ALTER TABLE public.voice_call_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice transcripts" ON public.voice_call_transcripts FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid NOT NULL REFERENCES public.voice_call_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  provider_recording_id text,
  duration_seconds integer,
  size_bytes bigint,
  mime_type text DEFAULT 'audio/mpeg',
  consent_captured boolean NOT NULL DEFAULT false,
  retention_expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_recordings_session ON public.voice_call_recordings(call_session_id);
GRANT SELECT, DELETE ON public.voice_call_recordings TO authenticated;
GRANT ALL ON public.voice_call_recordings TO service_role;
ALTER TABLE public.voice_call_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice recordings" ON public.voice_call_recordings FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins delete voice recordings" ON public.voice_call_recordings FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.voice_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.voice_assistants(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('faq','business_profile','service','policy','url','document','text')),
  title text NOT NULL,
  content text,
  url text,
  storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed','disabled')),
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_knowledge_workspace ON public.voice_knowledge_sources(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_knowledge_sources TO authenticated;
GRANT ALL ON public.voice_knowledge_sources TO service_role;
ALTER TABLE public.voice_knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice knowledge" ON public.voice_knowledge_sources FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert voice knowledge" ON public.voice_knowledge_sources FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update voice knowledge" ON public.voice_knowledge_sources FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins delete voice knowledge" ON public.voice_knowledge_sources FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_voice_knowledge_updated BEFORE UPDATE ON public.voice_knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.voice_knowledge_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, chunk_index)
);
CREATE INDEX idx_voice_chunks_workspace ON public.voice_knowledge_chunks(workspace_id);
CREATE INDEX idx_voice_chunks_search ON public.voice_knowledge_chunks USING gin (to_tsvector('english', content));
GRANT SELECT ON public.voice_knowledge_chunks TO authenticated;
GRANT ALL ON public.voice_knowledge_chunks TO service_role;
ALTER TABLE public.voice_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice chunks" ON public.voice_knowledge_chunks FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_unanswered_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.voice_assistants(id) ON DELETE SET NULL,
  call_session_id uuid REFERENCES public.voice_call_sessions(id) ON DELETE SET NULL,
  question text NOT NULL,
  suggested_answer text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_unanswered_workspace ON public.voice_unanswered_questions(workspace_id, status);
GRANT SELECT, UPDATE ON public.voice_unanswered_questions TO authenticated;
GRANT ALL ON public.voice_unanswered_questions TO service_role;
ALTER TABLE public.voice_unanswered_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view unanswered questions" ON public.voice_unanswered_questions FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update unanswered questions" ON public.voice_unanswered_questions FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid REFERENCES public.voice_call_sessions(id) ON DELETE SET NULL,
  usage_type text NOT NULL DEFAULT 'call_minutes',
  seconds integer NOT NULL DEFAULT 0,
  minutes numeric GENERATED ALWAYS AS (round(seconds::numeric / 60.0, 2)) STORED,
  credits numeric NOT NULL DEFAULT 0,
  overage boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_usage_workspace ON public.voice_usage_events(workspace_id, occurred_at DESC);
GRANT SELECT ON public.voice_usage_events TO authenticated;
GRANT ALL ON public.voice_usage_events TO service_role;
ALTER TABLE public.voice_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice usage" ON public.voice_usage_events FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.voice_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  recording_enabled boolean NOT NULL DEFAULT false,
  recording_retention_days integer NOT NULL DEFAULT 90,
  transcript_retention_days integer NOT NULL DEFAULT 365,
  max_concurrent_calls integer NOT NULL DEFAULT 1,
  included_minutes integer NOT NULL DEFAULT 0,
  overage_rate_pence numeric NOT NULL DEFAULT 0,
  transfer_number text,
  notification_emails text[] NOT NULL DEFAULT '{}',
  provider_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.voice_settings TO authenticated;
GRANT ALL ON public.voice_settings TO service_role;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view voice settings" ON public.voice_settings FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins insert voice settings" ON public.voice_settings FOR INSERT WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins update voice settings" ON public.voice_settings FOR UPDATE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_voice_settings_updated BEFORE UPDATE ON public.voice_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the two private voice buckets
CREATE POLICY "Members read voice recordings" ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-recordings' AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "Admins delete voice recordings" ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-recordings' AND public.is_workspace_admin(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "Members read voice knowledge files" ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-knowledge' AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "Members upload voice knowledge files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-knowledge' AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "Admins delete voice knowledge files" ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-knowledge' AND public.is_workspace_admin(auth.uid(), (storage.foldername(name))[1]::uuid));