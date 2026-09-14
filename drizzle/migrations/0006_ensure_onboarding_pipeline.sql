CREATE OR REPLACE FUNCTION public.ensure_onboarding_pipeline(
  p_workspace_id uuid,
  p_stage_names text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline_id uuid;
  v_stage_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'You do not have access to this workspace';
  END IF;

  IF COALESCE(array_length(p_stage_names, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one pipeline stage is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));

  SELECT p.id
  INTO v_pipeline_id
  FROM public.crm_pipelines p
  WHERE p.workspace_id = p_workspace_id
  ORDER BY p.is_default DESC, p.position ASC, p.created_at ASC
  LIMIT 1;

  IF v_pipeline_id IS NULL THEN
    INSERT INTO public.crm_pipelines (workspace_id, name, is_default, position, created_by)
    VALUES (p_workspace_id, 'Sales Pipeline', true, 0, auth.uid())
    RETURNING id INTO v_pipeline_id;
  END IF;

  SELECT count(*)
  INTO v_stage_count
  FROM public.crm_pipeline_stages s
  WHERE s.pipeline_id = v_pipeline_id;

  IF v_stage_count = 0 THEN
    INSERT INTO public.crm_pipeline_stages (pipeline_id, workspace_id, name, position)
    SELECT v_pipeline_id, p_workspace_id, btrim(stage_name), ordinality - 1
    FROM unnest(p_stage_names) WITH ORDINALITY AS stages(stage_name, ordinality)
    WHERE btrim(stage_name) <> '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.crm_pipeline_stages s WHERE s.pipeline_id = v_pipeline_id
  ) THEN
    RAISE EXCEPTION 'The sales pipeline could not be configured';
  END IF;

  RETURN v_pipeline_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_onboarding_pipeline(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_onboarding_pipeline(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_onboarding_pipeline(uuid, text[]) TO service_role;