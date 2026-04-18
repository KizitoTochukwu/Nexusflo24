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
BEGIN
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

  IF _delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT score, status, workspace_id, user_id, assigned_owner_id
  INTO _new_score, _old_status, _lead_ws_id, _lead_owner_id, _lead_assigned_id
  FROM public.leads
  WHERE id = NEW.lead_id;

  _new_score := GREATEST(0, COALESCE(_new_score, 0) + _delta);

  _new_status := CASE
    WHEN _new_score >= 81 THEN 'Hot'
    WHEN _new_score >= 21 THEN 'Warm'
    ELSE 'New'
  END;

  UPDATE public.leads
  SET score = _new_score,
      status = _new_status,
      updated_at = now()
  WHERE id = NEW.lead_id;

  IF _new_status = 'Hot' AND _old_status IS DISTINCT FROM 'Hot' THEN
    _notify_target_user := COALESCE(_lead_assigned_id, _lead_owner_id);

    -- In-app notification
    INSERT INTO public.notifications (workspace_id, user_id, title, body, type, meta)
    VALUES (
      _lead_ws_id,
      _notify_target_user,
      '🔥 Hot Lead Alert',
      'A lead scored ' || _new_score || ' and is now a Hot Lead!',
      'lead_hot',
      jsonb_build_object('lead_id', NEW.lead_id, 'score', _new_score)
    );

    -- Fire-and-forget SMS/WhatsApp phone alert via edge function (verify_jwt=false)
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