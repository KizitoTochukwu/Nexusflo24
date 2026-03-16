
-- DB trigger function: detect tag changes on leads and fire campaign triggers via pg_net
CREATE OR REPLACE FUNCTION public.check_lead_tag_triggers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _old_tags text[];
  _new_tags text[];
  _added text[];
  _removed text[];
  _tag text;
  _supabase_url text;
  _service_role_key text;
BEGIN
  _old_tags := COALESCE(OLD.tags, '{}');
  _new_tags := COALESCE(NEW.tags, '{}');

  -- Skip if tags haven't changed
  IF _old_tags = _new_tags THEN
    RETURN NEW;
  END IF;

  -- Calculate added and removed tags
  _added := ARRAY(SELECT unnest(_new_tags) EXCEPT SELECT unnest(_old_tags));
  _removed := ARRAY(SELECT unnest(_old_tags) EXCEPT SELECT unnest(_new_tags));

  -- Get config from vault/env
  SELECT current_setting('app.settings.supabase_url', true) INTO _supabase_url;
  SELECT current_setting('app.settings.service_role_key', true) INTO _service_role_key;

  -- If settings not available, try from extensions.http or skip
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    RETURN NEW;
  END IF;

  -- Fire tag_added triggers
  FOREACH _tag IN ARRAY _added LOOP
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/check-campaign-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'workspace_id', NEW.workspace_id,
        'lead_id', NEW.id,
        'trigger_type', 'tag_added',
        'trigger_value', _tag
      )
    );
  END LOOP;

  -- Fire tag_removed triggers
  FOREACH _tag IN ARRAY _removed LOOP
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/check-campaign-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'workspace_id', NEW.workspace_id,
        'lead_id', NEW.id,
        'trigger_type', 'tag_removed',
        'trigger_value', _tag
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create the trigger on leads table for tag changes
DROP TRIGGER IF EXISTS trg_lead_tag_campaign_triggers ON public.leads;
CREATE TRIGGER trg_lead_tag_campaign_triggers
  AFTER UPDATE OF tags ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lead_tag_triggers();

-- Update the score function to also fire score_threshold campaign triggers
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
  _supabase_url text;
  _service_role_key text;
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

  IF _delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT score, status, workspace_id, user_id
  INTO _new_score, _old_status, _lead_ws_id, _lead_owner_id
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

  -- If lead just became Hot, create a notification
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

  -- Fire score_threshold campaign triggers via pg_net
  SELECT current_setting('app.settings.supabase_url', true) INTO _supabase_url;
  SELECT current_setting('app.settings.service_role_key', true) INTO _service_role_key;

  IF _supabase_url IS NOT NULL AND _supabase_url != '' AND _delta > 0 THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/check-campaign-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'workspace_id', _lead_ws_id,
        'lead_id', NEW.lead_id,
        'trigger_type', 'score_threshold',
        'trigger_value', _new_score::text
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;
