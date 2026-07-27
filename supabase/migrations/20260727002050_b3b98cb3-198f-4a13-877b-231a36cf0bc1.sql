-- 1) Connections
CREATE TABLE public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_key text NOT NULL,
  client_name text,
  oauth_client_id text,
  status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcp_connections_ws ON public.mcp_connections(workspace_id);
CREATE UNIQUE INDEX idx_mcp_connections_ws_client ON public.mcp_connections(workspace_id, oauth_client_id) WHERE oauth_client_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;
ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_connections_select" ON public.mcp_connections FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "mcp_connections_insert" ON public.mcp_connections FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "mcp_connections_update" ON public.mcp_connections FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "mcp_connections_delete" ON public.mcp_connections FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_mcp_connections_updated BEFORE UPDATE ON public.mcp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tool permissions
CREATE TABLE public.mcp_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  permission_group text NOT NULL,
  access_level text NOT NULL DEFAULT 'view',
  require_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, permission_group)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_tool_permissions TO authenticated;
GRANT ALL ON public.mcp_tool_permissions TO service_role;
ALTER TABLE public.mcp_tool_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_perms_select" ON public.mcp_tool_permissions FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "mcp_perms_insert" ON public.mcp_tool_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "mcp_perms_update" ON public.mcp_tool_permissions FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "mcp_perms_delete" ON public.mcp_tool_permissions FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_mcp_perms_updated BEFORE UPDATE ON public.mcp_tool_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Activity log
CREATE TABLE public.mcp_tool_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  client_key text,
  oauth_client_id text,
  tool_name text NOT NULL,
  summary text,
  risk_level text NOT NULL DEFAULT 'low',
  approval_status text NOT NULL DEFAULT 'not_required',
  execution_status text NOT NULL DEFAULT 'success',
  error_code text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcp_activity_ws_time ON public.mcp_tool_activity(workspace_id, created_at DESC);

GRANT SELECT ON public.mcp_tool_activity TO authenticated;
GRANT ALL ON public.mcp_tool_activity TO service_role;
ALTER TABLE public.mcp_tool_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_activity_select" ON public.mcp_tool_activity FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id));

-- 4) Action approvals
CREATE TABLE public.mcp_action_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_by uuid,
  client_key text,
  tool_name text NOT NULL,
  summary text,
  args_digest text,
  risk_level text NOT NULL DEFAULT 'high',
  decision text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcp_approvals_ws ON public.mcp_action_approvals(workspace_id, decision);

GRANT SELECT, UPDATE ON public.mcp_action_approvals TO authenticated;
GRANT ALL ON public.mcp_action_approvals TO service_role;
ALTER TABLE public.mcp_action_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_approvals_select" ON public.mcp_action_approvals FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "mcp_approvals_update" ON public.mcp_action_approvals FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_mcp_approvals_updated BEFORE UPDATE ON public.mcp_action_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Rate limits (backend only)
CREATE TABLE public.mcp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, window_start)
);
GRANT ALL ON public.mcp_rate_limits TO service_role;
ALTER TABLE public.mcp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_mcp_rate_limits_updated BEFORE UPDATE ON public.mcp_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();