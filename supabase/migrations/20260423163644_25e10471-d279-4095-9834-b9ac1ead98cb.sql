CREATE TABLE public.automation_smart_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  condition_value TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, condition_value)
);

CREATE INDEX idx_smart_actions_workspace ON public.automation_smart_actions(workspace_id);

ALTER TABLE public.automation_smart_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view smart actions"
ON public.automation_smart_actions
FOR SELECT
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can insert smart actions"
ON public.automation_smart_actions
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update smart actions"
ON public.automation_smart_actions
FOR UPDATE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete smart actions"
ON public.automation_smart_actions
FOR DELETE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER update_smart_actions_updated_at
BEFORE UPDATE ON public.automation_smart_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();