-- ============ APPOINTMENT TYPES ============
CREATE TABLE public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  booking_page_id UUID REFERENCES public.booking_pages(id) ON DELETE SET NULL,
  created_by UUID,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'one_to_one',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  min_notice_minutes INTEGER NOT NULL DEFAULT 60,
  max_days_ahead INTEGER NOT NULL DEFAULT 60,
  max_per_day INTEGER,
  capacity INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#0B1F3B',
  location_type TEXT NOT NULL DEFAULT 'google_meet',
  location_value TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  availability_schedule_id UUID,
  team_id UUID,
  host_user_id UUID,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminder_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  cancel_cutoff_minutes INTEGER NOT NULL DEFAULT 60,
  reschedule_cutoff_minutes INTEGER NOT NULL DEFAULT 60,
  max_reschedules INTEGER NOT NULL DEFAULT 3,
  require_confirmation BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_types TO authenticated;
GRANT SELECT ON public.appointment_types TO anon;
GRANT ALL ON public.appointment_types TO service_role;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read appointment types" ON public.appointment_types FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert appointment types" ON public.appointment_types FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update appointment types" ON public.appointment_types FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins delete appointment types" ON public.appointment_types FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE INDEX idx_appointment_types_ws ON public.appointment_types(workspace_id);
CREATE INDEX idx_appointment_types_page ON public.appointment_types(booking_page_id);
CREATE TRIGGER trg_appointment_types_updated_at BEFORE UPDATE ON public.appointment_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AVAILABILITY SCHEDULES ============
CREATE TABLE public.availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL DEFAULT 'Working hours',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_schedules TO authenticated;
GRANT ALL ON public.availability_schedules TO service_role;
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage schedules" ON public.availability_schedules FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_avail_sched_ws ON public.availability_schedules(workspace_id);
CREATE TRIGGER trg_avail_sched_updated_at BEFORE UPDATE ON public.availability_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.availability_schedules(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT ALL ON public.availability_rules TO service_role;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage availability rules" ON public.availability_rules FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_avail_rules_sched ON public.availability_rules(schedule_id);

CREATE TABLE public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.availability_schedules(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_unavailable BOOLEAN NOT NULL DEFAULT true,
  start_time TEXT,
  end_time TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage availability overrides" ON public.availability_overrides FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_avail_over_sched ON public.availability_overrides(schedule_id, override_date);

-- ============ BOOKING TEAMS ============
CREATE TABLE public.booking_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assignment_method TEXT NOT NULL DEFAULT 'round_robin',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_teams TO authenticated;
GRANT ALL ON public.booking_teams TO service_role;
ALTER TABLE public.booking_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read booking teams" ON public.booking_teams FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins manage booking teams" ON public.booking_teams FOR ALL TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE INDEX idx_booking_teams_ws ON public.booking_teams(workspace_id);
CREATE TRIGGER trg_booking_teams_updated_at BEFORE UPDATE ON public.booking_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.booking_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.booking_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  max_per_day INTEGER,
  availability_schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_team_members TO authenticated;
GRANT ALL ON public.booking_team_members TO service_role;
ALTER TABLE public.booking_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read booking team members" ON public.booking_team_members FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins manage booking team members" ON public.booking_team_members FOR ALL TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE INDEX idx_booking_team_members_team ON public.booking_team_members(team_id);

-- ============ REMINDERS / EVENTS / ATTENDEES ============
CREATE TABLE public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'guest',
  offset_minutes INTEGER NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_response JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, channel, audience, offset_minutes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_reminders TO authenticated;
GRANT ALL ON public.booking_reminders TO service_role;
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read booking reminders" ON public.booking_reminders FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members manage booking reminders" ON public.booking_reminders FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_booking_reminders_due ON public.booking_reminders(status, send_at);
CREATE TRIGGER trg_booking_reminders_updated_at BEFORE UPDATE ON public.booking_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_user_id UUID,
  source TEXT NOT NULL DEFAULT 'system',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, event_type, idempotency_key)
);
GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read booking events" ON public.booking_events FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_booking_events_booking ON public.booking_events(booking_id, created_at DESC);
CREATE INDEX idx_booking_events_ws ON public.booking_events(workspace_id, created_at DESC);

CREATE TABLE public.booking_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  lead_id UUID,
  status TEXT NOT NULL DEFAULT 'confirmed',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_attendees TO authenticated;
GRANT ALL ON public.booking_attendees TO service_role;
ALTER TABLE public.booking_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage booking attendees" ON public.booking_attendees FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_booking_attendees_booking ON public.booking_attendees(booking_id);

-- ============ EXTEND EXISTING TABLES ============
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS host_user_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id UUID,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS deal_id UUID,
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'public_page',
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_actor_id UUID,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_host_time ON public.bookings(host_user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON public.bookings(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ws_time ON public.bookings(workspace_id, start_time);

ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intro_text TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS host_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS host_display_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

ALTER TABLE public.appointment_types
  ADD CONSTRAINT appointment_types_schedule_fk FOREIGN KEY (availability_schedule_id) REFERENCES public.availability_schedules(id) ON DELETE SET NULL,
  ADD CONSTRAINT appointment_types_team_fk FOREIGN KEY (team_id) REFERENCES public.booking_teams(id) ON DELETE SET NULL;

-- ============ BACKFILL EXISTING PAGES INTO APPOINTMENT TYPES ============
INSERT INTO public.appointment_types (
  workspace_id, booking_page_id, created_by, name, slug, description, kind,
  duration_minutes, slot_interval_minutes, buffer_after_minutes, max_days_ahead,
  color, location_type, location_value, timezone, host_user_id, is_published, position
)
SELECT
  bp.workspace_id, bp.id, bp.user_id, bp.name, bp.slug, COALESCE(bp.description, ''), 'one_to_one',
  COALESCE(bp.duration_minutes, 30), COALESCE(bp.duration_minutes, 30), COALESCE(bp.buffer_minutes, 0),
  COALESCE(bp.max_days_ahead, 60), COALESCE(bp.color, '#0B1F3B'),
  COALESCE(bp.location_type, 'google_meet'), bp.location_value,
  COALESCE(bp.timezone, 'UTC'), bp.user_id, (bp.status = 'active'), 0
FROM public.booking_pages bp
WHERE NOT EXISTS (SELECT 1 FROM public.appointment_types at WHERE at.booking_page_id = bp.id);

UPDATE public.bookings b
SET appointment_type_id = at.id,
    host_user_id = COALESCE(b.host_user_id, bp.user_id)
FROM public.booking_pages bp
JOIN public.appointment_types at ON at.booking_page_id = bp.id
WHERE b.booking_page_id = bp.id AND b.appointment_type_id IS NULL;

-- ============ ROUND-ROBIN HOST PICKER ============
CREATE OR REPLACE FUNCTION public.pick_booking_host(
  _team_id UUID, _start TIMESTAMPTZ, _end TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _host UUID;
BEGIN
  SELECT m.user_id INTO _host
  FROM public.booking_team_members m
  WHERE m.team_id = _team_id
    AND m.is_paused = false
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.host_user_id = m.user_id
        AND b.status IN ('confirmed','pending')
        AND b.start_time < _end AND b.end_time > _start
    )
    AND (
      m.max_per_day IS NULL OR (
        SELECT count(*) FROM public.bookings b2
        WHERE b2.host_user_id = m.user_id
          AND b2.status IN ('confirmed','pending')
          AND b2.start_time::date = _start::date
      ) < m.max_per_day
    )
  ORDER BY m.priority ASC, (
    SELECT count(*) FROM public.bookings b3
    WHERE b3.host_user_id = m.user_id AND b3.start_time > now() - interval '30 days'
  ) ASC, m.created_at ASC
  LIMIT 1;
  RETURN _host;
END;
$$;

-- ============ PUBLIC READ RPC FOR APPOINTMENT TYPES ============
CREATE OR REPLACE FUNCTION public.get_public_appointment_types(p_page_id UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT, duration_minutes INTEGER, color TEXT, location_type TEXT, location_value TEXT, questions JSONB, kind TEXT, capacity INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT at.id, at.name, at.description, at.duration_minutes, at.color, at.location_type, at.location_value, at.questions, at.kind, at.capacity
  FROM public.appointment_types at
  JOIN public.booking_pages bp ON bp.id = at.booking_page_id
  WHERE at.booking_page_id = p_page_id AND at.is_published = true AND bp.status = 'active'
  ORDER BY at.position ASC, at.created_at ASC;
$$;