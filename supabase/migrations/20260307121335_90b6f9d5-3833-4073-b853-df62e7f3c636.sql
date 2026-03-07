
-- 1. Create the scoring function (SECURITY DEFINER to bypass RLS)
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
BEGIN
  -- Determine score delta based on activity type
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

  -- Skip if no score change
  IF _delta = 0 THEN
    RETURN NEW;
  END IF;

  -- Get current lead info
  SELECT score, status, workspace_id, user_id
  INTO _new_score, _old_status, _lead_ws_id, _lead_owner_id
  FROM public.leads
  WHERE id = NEW.lead_id;

  -- Calculate new score (clamp to 0 minimum)
  _new_score := GREATEST(0, COALESCE(_new_score, 0) + _delta);

  -- Derive status from score thresholds
  _new_status := CASE
    WHEN _new_score >= 81 THEN 'Hot'
    WHEN _new_score >= 21 THEN 'Warm'
    ELSE 'New'
  END;

  -- Update the lead
  UPDATE public.leads
  SET score = _new_score,
      status = _new_status,
      updated_at = now()
  WHERE id = NEW.lead_id;

  -- If lead just became Hot, create a notification for the workspace owner
  IF _new_status = 'Hot' AND _old_status IS DISTINCT FROM 'Hot' THEN
    INSERT INTO public.notifications (workspace_id, user_id, title, body, type, meta)
    VALUES (
      _lead_ws_id,
      _lead_owner_id,
      '🔥 Hot Lead Alert',
      'A lead scored ' || _new_score || ' and is now a Hot Lead!',
      'lead_hot',
      jsonb_build_object('lead_id', NEW.lead_id, 'score', _new_score)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Create the trigger on lead_activities
CREATE TRIGGER trg_lead_score_on_activity
  AFTER INSERT ON public.lead_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score_on_activity();

-- 3. Create decay function for inactive leads
CREATE OR REPLACE FUNCTION public.decay_inactive_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
BEGIN
  WITH decayed AS (
    UPDATE public.leads
    SET score = GREATEST(0, COALESCE(score, 0) - 20),
        status = CASE
          WHEN GREATEST(0, COALESCE(score, 0) - 20) >= 81 THEN 'Hot'
          WHEN GREATEST(0, COALESCE(score, 0) - 20) >= 21 THEN 'Warm'
          ELSE 'New'
        END,
        updated_at = now()
    WHERE COALESCE(score, 0) > 0
      AND (last_activity_at IS NULL OR last_activity_at < now() - interval '30 days')
    RETURNING id
  )
  SELECT count(*) INTO _count FROM decayed;

  RETURN _count;
END;
$function$;
