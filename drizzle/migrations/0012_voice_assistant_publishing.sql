-- Admins may record published versions; members already read them.
CREATE POLICY "Admins insert assistant versions"
  ON public.voice_assistant_versions FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

GRANT SELECT, INSERT ON public.voice_assistant_versions TO authenticated;
GRANT ALL ON public.voice_assistant_versions TO service_role;

-- Publish the current draft configuration as the next immutable version.
CREATE OR REPLACE FUNCTION public.voice_publish_assistant(
  _assistant_id uuid,
  _config jsonb,
  _runtime_prompt text,
  _activate boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws uuid;
  _next integer;
BEGIN
  SELECT workspace_id INTO _ws FROM public.voice_assistants WHERE id = _assistant_id;
  IF _ws IS NULL THEN
    RAISE EXCEPTION 'Assistant not found';
  END IF;
  IF NOT public.is_workspace_admin(auth.uid(), _ws) THEN
    RAISE EXCEPTION 'Only workspace admins can publish an assistant';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO _next
  FROM public.voice_assistant_versions WHERE assistant_id = _assistant_id;

  INSERT INTO public.voice_assistant_versions
    (workspace_id, assistant_id, version, config, runtime_prompt, published_by)
  VALUES (_ws, _assistant_id, _next, COALESCE(_config, '{}'::jsonb), _runtime_prompt, auth.uid());

  UPDATE public.voice_assistants
  SET config = COALESCE(_config, '{}'::jsonb),
      runtime_prompt = _runtime_prompt,
      published_version = _next,
      status = CASE
        WHEN _activate AND status IN ('draft', 'testing') THEN 'testing'
        ELSE status
      END,
      updated_at = now()
  WHERE id = _assistant_id;

  RETURN _next;
END;
$$;

-- Restore a previously published version into the working configuration.
CREATE OR REPLACE FUNCTION public.voice_rollback_assistant(
  _assistant_id uuid,
  _version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws uuid;
  _cfg jsonb;
  _prompt text;
BEGIN
  SELECT workspace_id INTO _ws FROM public.voice_assistants WHERE id = _assistant_id;
  IF _ws IS NULL THEN
    RAISE EXCEPTION 'Assistant not found';
  END IF;
  IF NOT public.is_workspace_admin(auth.uid(), _ws) THEN
    RAISE EXCEPTION 'Only workspace admins can roll back an assistant';
  END IF;

  SELECT config, runtime_prompt INTO _cfg, _prompt
  FROM public.voice_assistant_versions
  WHERE assistant_id = _assistant_id AND version = _version;

  IF _cfg IS NULL THEN
    RAISE EXCEPTION 'Version % not found for this assistant', _version;
  END IF;

  UPDATE public.voice_assistants
  SET config = _cfg,
      runtime_prompt = _prompt,
      published_version = _version,
      updated_at = now()
  WHERE id = _assistant_id;

  RETURN _version;
END;
$$;

GRANT EXECUTE ON FUNCTION public.voice_publish_assistant(uuid, jsonb, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.voice_rollback_assistant(uuid, integer) TO authenticated;