
-- Helper function to atomically increment automation run count
CREATE OR REPLACE FUNCTION public.increment_automation_run(_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.automations
  SET run_count = run_count + 1,
      last_run_at = now(),
      updated_at = now()
  WHERE id = _automation_id;
END;
$function$;
