
CREATE TABLE public.workspace_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['blog:write']::text[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_api_keys_workspace ON public.workspace_api_keys(workspace_id);
CREATE INDEX idx_workspace_api_keys_hash ON public.workspace_api_keys(key_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_api_keys TO authenticated;
GRANT ALL ON public.workspace_api_keys TO service_role;

ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view api keys"
  ON public.workspace_api_keys FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create api keys"
  ON public.workspace_api_keys FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update api keys"
  ON public.workspace_api_keys FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete api keys"
  ON public.workspace_api_keys FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER set_workspace_api_keys_updated_at
  BEFORE UPDATE ON public.workspace_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.verify_workspace_api_key(_key_hash TEXT)
RETURNS TABLE(workspace_id UUID, scopes TEXT[], key_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id, scopes, id
  FROM public.workspace_api_keys
  WHERE key_hash = _key_hash AND revoked_at IS NULL
  LIMIT 1;
$$;
