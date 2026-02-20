
-- ============================================================
-- MULTI-TENANCY MIGRATION
-- ============================================================

-- 1) Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2) Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3) Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 4) Security definer function: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- 5) Security definer function: check workspace admin/owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role IN ('owner', 'admin')
  )
$$;

-- 6) Security definer function: get user's workspace IDs
CREATE OR REPLACE FUNCTION public.user_workspace_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id
$$;

-- 7) RLS for workspaces
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Owner/admin can update workspace"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owner can delete workspace"
  ON public.workspaces FOR DELETE
  USING (owner_user_id = auth.uid());

-- 8) RLS for workspace_members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admin/owner can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR auth.uid() = user_id);

CREATE POLICY "Admin/owner can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admin/owner can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- 9) RLS for invitations
CREATE POLICY "Members can view invitations"
  ON public.invitations FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admin/owner can manage invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admin/owner can update invitations"
  ON public.invitations FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admin/owner can delete invitations"
  ON public.invitations FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- 10) Add workspace_id to leads
ALTER TABLE public.leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 11) Add workspace_id to lead_activities
ALTER TABLE public.lead_activities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 12) Migrate subscriptions to workspace scope
ALTER TABLE public.subscriptions ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 13) Create default workspace for each existing user and backfill
DO $$
DECLARE
  r RECORD;
  ws_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT p.id, COALESCE(p.full_name, p.email) as name FROM public.profiles p LOOP
    -- Create workspace
    INSERT INTO public.workspaces (id, name, owner_user_id)
    VALUES (gen_random_uuid(), COALESCE(r.name, 'My') || '''s Workspace', r.id)
    RETURNING id INTO ws_id;

    -- Add as owner member
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (ws_id, r.id, 'owner');

    -- Backfill leads
    UPDATE public.leads SET workspace_id = ws_id WHERE user_id = r.id AND workspace_id IS NULL;

    -- Backfill lead_activities
    UPDATE public.lead_activities SET workspace_id = ws_id WHERE user_id = r.id AND workspace_id IS NULL;

    -- Backfill subscriptions
    UPDATE public.subscriptions SET workspace_id = ws_id WHERE user_id = r.id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- 14) Now make workspace_id NOT NULL after backfill
ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.lead_activities ALTER COLUMN workspace_id SET NOT NULL;

-- 15) Drop old unique indexes on leads and create workspace-scoped ones
DROP INDEX IF EXISTS idx_leads_user_email_unique;
DROP INDEX IF EXISTS idx_leads_user_phone_unique;

CREATE UNIQUE INDEX idx_leads_workspace_email_unique
  ON public.leads (workspace_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX idx_leads_workspace_phone_unique
  ON public.leads (workspace_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- 16) Performance indexes
CREATE INDEX idx_leads_workspace_created ON public.leads (workspace_id, created_at);
CREATE INDEX idx_leads_workspace_status ON public.leads (workspace_id, status);
CREATE INDEX idx_lead_activities_workspace ON public.lead_activities (workspace_id, created_at);

-- 17) Drop old RLS policies on leads and recreate workspace-scoped
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

CREATE POLICY "Members can view workspace leads"
  ON public.leads FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace leads"
  ON public.leads FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace leads"
  ON public.leads FOR UPDATE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace leads"
  ON public.leads FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- 18) Drop old RLS policies on lead_activities and recreate
DROP POLICY IF EXISTS "Users can view own lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can insert own lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can delete own lead activities" ON public.lead_activities;

CREATE POLICY "Members can view workspace activities"
  ON public.lead_activities FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace activities"
  ON public.lead_activities FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace activities"
  ON public.lead_activities FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- 19) Auto-update trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 20) DB function to create workspace on signup (called from edge function or trigger)
CREATE OR REPLACE FUNCTION public.handle_workspace_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid;
  ws_name text;
BEGIN
  ws_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)) || '''s Workspace';
  INSERT INTO public.workspaces (name, owner_user_id)
  VALUES (ws_name, NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- 21) Trigger: auto-create workspace when profile is created (which happens on signup)
CREATE TRIGGER on_profile_created_create_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspace_creation();
