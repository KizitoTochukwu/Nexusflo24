CREATE TABLE IF NOT EXISTS public.lead_scoring_settings (
  workspace_id uuid PRIMARY KEY,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  bands jsonb NOT NULL DEFAULT '{"hot":81,"warm":21}'::jsonb,
  decay jsonb NOT NULL DEFAULT '{"enabled":true,"days":30,"points":20}'::jsonb,
  custom_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_scoring_settings TO authenticated;
GRANT ALL ON public.lead_scoring_settings TO service_role;

ALTER TABLE public.lead_scoring_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read lead scoring settings" ON public.lead_scoring_settings;
CREATE POLICY "members read lead scoring settings"
ON public.lead_scoring_settings FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "admins insert lead scoring settings" ON public.lead_scoring_settings;
CREATE POLICY "admins insert lead scoring settings"
ON public.lead_scoring_settings FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "admins update lead scoring settings" ON public.lead_scoring_settings;
CREATE POLICY "admins update lead scoring settings"
ON public.lead_scoring_settings FOR UPDATE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "admins delete lead scoring settings" ON public.lead_scoring_settings;
CREATE POLICY "admins delete lead scoring settings"
ON public.lead_scoring_settings FOR DELETE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

DROP TRIGGER IF EXISTS set_lead_scoring_settings_updated_at ON public.lead_scoring_settings;
CREATE TRIGGER set_lead_scoring_settings_updated_at
BEFORE UPDATE ON public.lead_scoring_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_lead_score_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _delta integer;
  _new_score integer;
  _old_status text;
  _new_status text;
  _lead_ws_id uuid;
  _lead_owner_id uuid;
  _lead_assigned_id uuid;
  _notify_target_user uuid;
  _rules jsonb;
  _bands jsonb;
  _hot integer;
  _warm integer;
BEGIN
  SELECT score, status, workspace_id, user_id, assigned_owner_id
  INTO _new_score, _old_status, _lead_ws_id, _lead_owner_id, _lead_assigned_id
  FROM public.leads
  WHERE id = NEW.lead_id;

  SELECT rules, bands INTO _rules, _bands
  FROM public.lead_scoring_settings
  WHERE workspace_id = _lead_ws_id;

  IF _rules IS NOT NULL AND _rules ? NEW.type THEN
    _delta := COALESCE((_rules ->> NEW.type)::integer, 0);
  ELSE
    _delta := CASE NEW.type
      WHEN 'form_submit' THEN 10
      WHEN 'email_open' THEN 5
      WHEN 'link_click' THEN 10
      WHEN 'lead_magnet_download' THEN 20
      WHEN 'website_visit' THEN 5
      WHEN 'pricing_page_visit' THEN 25
      WHEN 'webinar_registration' THEN 30
      WHEN 'call_booking' THEN 50
      WHEN 'email_unsubscribe' THEN -50
      ELSE 0
    END;
  END IF;

  IF _delta = 0 THEN
    RETURN NEW;
  END IF;

  _hot := COALESCE((_bands ->> 'hot')::integer, 81);
  _warm := COALESCE((_bands ->> 'warm')::integer, 21);

  _new_score := GREATEST(0, COALESCE(_new_score, 0) + _delta);

  _new_status := CASE
    WHEN _new_score >= _hot THEN 'Hot'
    WHEN _new_score >= _warm THEN 'Warm'
    ELSE 'New'
  END;

  UPDATE public.leads
  SET score = _new_score,
      status = _new_status,
      updated_at = now()
  WHERE id = NEW.lead_id;

  IF _new_status = 'Hot' AND _old_status IS DISTINCT FROM 'Hot' THEN
    _notify_target_user := COALESCE(_lead_assigned_id, _lead_owner_id);

    INSERT INTO public.notifications (workspace_id, user_id, title, body, type, meta)
    VALUES (
      _lead_ws_id,
      _notify_target_user,
      '🔥 Hot Lead Alert',
      'A lead scored ' || _new_score || ' and is now a Hot Lead!',
      'lead_hot',
      jsonb_build_object('lead_id', NEW.lead_id, 'score', _new_score)
    );

    BEGIN
      PERFORM net.http_post(
        url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/notify-hot-lead',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC5pMk8xUUE'
        ),
        body := jsonb_build_object(
          'lead_id', NEW.lead_id,
          'workspace_id', _lead_ws_id,
          'score', _new_score,
          'notify_user_id', _notify_target_user
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify-hot-lead dispatch failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decay_inactive_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
BEGIN
  WITH cfg AS (
    SELECT l.id,
           COALESCE((s.decay ->> 'enabled')::boolean, true) AS enabled,
           COALESCE((s.decay ->> 'days')::integer, 30) AS days,
           COALESCE((s.decay ->> 'points')::integer, 20) AS points,
           COALESCE((s.bands ->> 'hot')::integer, 81) AS hot,
           COALESCE((s.bands ->> 'warm')::integer, 21) AS warm,
           GREATEST(0, COALESCE(l.score, 0) - COALESCE((s.decay ->> 'points')::integer, 20)) AS next_score,
           l.last_activity_at,
           l.score
    FROM public.leads l
    LEFT JOIN public.lead_scoring_settings s ON s.workspace_id = l.workspace_id
  ), decayed AS (
    UPDATE public.leads le
    SET score = c.next_score,
        status = CASE
          WHEN c.next_score >= c.hot THEN 'Hot'
          WHEN c.next_score >= c.warm THEN 'Warm'
          ELSE 'New'
        END,
        updated_at = now()
    FROM cfg c
    WHERE le.id = c.id
      AND c.enabled
      AND COALESCE(c.score, 0) > 0
      AND (c.last_activity_at IS NULL OR c.last_activity_at < now() - make_interval(days => c.days))
    RETURNING le.id
  )
  SELECT count(*) INTO _count FROM decayed;

  RETURN _count;
END;
$function$;