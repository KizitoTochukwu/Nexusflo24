-- Track round-robin pointer per workspace
CREATE TABLE public.workspace_assignment_state (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  last_assigned_user_id UUID,
  round_robin_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_assignment_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace assignment state"
ON public.workspace_assignment_state FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update assignment state"
ON public.workspace_assignment_state FOR UPDATE TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert assignment state"
ON public.workspace_assignment_state FOR INSERT TO authenticated
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Service can manage assignment state"
ON public.workspace_assignment_state FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_workspace_assignment_state_updated_at
BEFORE UPDATE ON public.workspace_assignment_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: atomically pick the next rep in round-robin
CREATE OR REPLACE FUNCTION public.assign_next_round_robin(_workspace_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _members UUID[];
  _last UUID;
  _next UUID;
  _idx INT;
  _enabled BOOLEAN;
BEGIN
  -- Ensure state row exists
  INSERT INTO public.workspace_assignment_state (workspace_id)
  VALUES (_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT last_assigned_user_id, round_robin_enabled
  INTO _last, _enabled
  FROM public.workspace_assignment_state
  WHERE workspace_id = _workspace_id
  FOR UPDATE;

  IF NOT _enabled THEN
    RETURN NULL;
  END IF;

  -- Eligible reps = workspace members with role owner/admin/member, ordered stably
  SELECT array_agg(user_id ORDER BY created_at, user_id)
  INTO _members
  FROM public.workspace_members
  WHERE workspace_id = _workspace_id;

  IF _members IS NULL OR array_length(_members, 1) = 0 THEN
    RETURN NULL;
  END IF;

  IF _last IS NULL THEN
    _next := _members[1];
  ELSE
    _idx := array_position(_members, _last);
    IF _idx IS NULL OR _idx >= array_length(_members, 1) THEN
      _next := _members[1];
    ELSE
      _next := _members[_idx + 1];
    END IF;
  END IF;

  UPDATE public.workspace_assignment_state
  SET last_assigned_user_id = _next, updated_at = now()
  WHERE workspace_id = _workspace_id;

  RETURN _next;
END;
$$;