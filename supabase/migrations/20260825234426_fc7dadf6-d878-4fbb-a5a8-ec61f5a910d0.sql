CREATE TABLE IF NOT EXISTS public.oauth_connection_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta','google','linkedin')),
  redirect_to text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_connection_states TO service_role;
ALTER TABLE public.oauth_connection_states ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS oauth_connection_states_expiry_idx ON public.oauth_connection_states (expires_at) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ad_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta','google','linkedin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('connected','needs_attention','disconnected','pending')),
  business_name text NULL,
  external_business_id text NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  credentials_encrypted text NULL,
  token_expires_at timestamptz NULL,
  last_sync_at timestamptz NULL,
  last_error text NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);
GRANT SELECT (id, workspace_id, provider, status, business_name, external_business_id, scopes, token_expires_at, last_sync_at, last_error, is_demo, created_by, created_at, updated_at) ON public.ad_connections TO authenticated;
GRANT INSERT (workspace_id, provider, status, business_name, external_business_id, scopes, token_expires_at, last_sync_at, last_error, is_demo, created_by) ON public.ad_connections TO authenticated;
GRANT UPDATE (status, business_name, external_business_id, scopes, token_expires_at, last_sync_at, last_error, is_demo, updated_at) ON public.ad_connections TO authenticated;
GRANT DELETE ON public.ad_connections TO authenticated;
GRANT ALL ON public.ad_connections TO service_role;
ALTER TABLE public.ad_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view ad connections" ON public.ad_connections FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can create ad connections" ON public.ad_connections FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "Workspace admins can update ad connections" ON public.ad_connections FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete ad connections" ON public.ad_connections FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER update_ad_connections_updated_at BEFORE UPDATE ON public.ad_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid NULL REFERENCES public.ad_connections(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta','google','linkedin')),
  external_account_id text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active',
  default_pipeline_id uuid NULL REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  default_owner_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, external_account_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_accounts TO authenticated;
GRANT ALL ON public.ad_accounts TO service_role;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view ad accounts" ON public.ad_accounts FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can create ad accounts" ON public.ad_accounts FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can update ad accounts" ON public.ad_accounts FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete ad accounts" ON public.ad_accounts FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON public.ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ad_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid NULL REFERENCES public.ad_connections(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('meta','google','linkedin')),
  status text NOT NULL CHECK (status IN ('running','success','partial','failed')),
  records_synced integer NOT NULL DEFAULT 0,
  message text NULL,
  technical_details jsonb NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);
GRANT SELECT ON public.ad_sync_logs TO authenticated;
GRANT ALL ON public.ad_sync_logs TO service_role;
ALTER TABLE public.ad_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view ad sync logs" ON public.ad_sync_logs FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX IF NOT EXISTS ad_sync_logs_workspace_started_idx ON public.ad_sync_logs (workspace_id, started_at DESC);