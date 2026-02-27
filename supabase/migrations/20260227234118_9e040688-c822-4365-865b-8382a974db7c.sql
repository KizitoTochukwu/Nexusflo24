
-- Make all RLS policies PERMISSIVE (drop RESTRICTIVE and recreate as PERMISSIVE)

-- ============ automation_logs ============
DROP POLICY IF EXISTS "Members can delete workspace automation logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Members can insert workspace automation logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Members can view workspace automation logs" ON public.automation_logs;

CREATE POLICY "Members can view workspace automation logs" ON public.automation_logs FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace automation logs" ON public.automation_logs FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace automation logs" ON public.automation_logs FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ automation_steps ============
DROP POLICY IF EXISTS "Members can delete workspace automation steps" ON public.automation_steps;
DROP POLICY IF EXISTS "Members can insert workspace automation steps" ON public.automation_steps;
DROP POLICY IF EXISTS "Members can update workspace automation steps" ON public.automation_steps;
DROP POLICY IF EXISTS "Members can view workspace automation steps" ON public.automation_steps;

CREATE POLICY "Members can view workspace automation steps" ON public.automation_steps FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace automation steps" ON public.automation_steps FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace automation steps" ON public.automation_steps FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace automation steps" ON public.automation_steps FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ automations ============
DROP POLICY IF EXISTS "Members can delete workspace automations" ON public.automations;
DROP POLICY IF EXISTS "Members can insert workspace automations" ON public.automations;
DROP POLICY IF EXISTS "Members can update workspace automations" ON public.automations;
DROP POLICY IF EXISTS "Members can view workspace automations" ON public.automations;

CREATE POLICY "Members can view workspace automations" ON public.automations FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace automations" ON public.automations FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace automations" ON public.automations FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace automations" ON public.automations FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ campaign_messages ============
DROP POLICY IF EXISTS "Members can delete workspace campaign messages" ON public.campaign_messages;
DROP POLICY IF EXISTS "Members can insert workspace campaign messages" ON public.campaign_messages;
DROP POLICY IF EXISTS "Members can update workspace campaign messages" ON public.campaign_messages;
DROP POLICY IF EXISTS "Members can view workspace campaign messages" ON public.campaign_messages;

CREATE POLICY "Members can view workspace campaign messages" ON public.campaign_messages FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace campaign messages" ON public.campaign_messages FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace campaign messages" ON public.campaign_messages FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace campaign messages" ON public.campaign_messages FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ campaigns ============
DROP POLICY IF EXISTS "Members can delete workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can insert workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can update workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can view workspace campaigns" ON public.campaigns;

CREATE POLICY "Members can view workspace campaigns" ON public.campaigns FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace campaigns" ON public.campaigns FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ funnel_steps ============
DROP POLICY IF EXISTS "Members can delete workspace funnel steps" ON public.funnel_steps;
DROP POLICY IF EXISTS "Members can insert workspace funnel steps" ON public.funnel_steps;
DROP POLICY IF EXISTS "Members can update workspace funnel steps" ON public.funnel_steps;
DROP POLICY IF EXISTS "Members can view workspace funnel steps" ON public.funnel_steps;

CREATE POLICY "Members can view workspace funnel steps" ON public.funnel_steps FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnel steps" ON public.funnel_steps FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace funnel steps" ON public.funnel_steps FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnel steps" ON public.funnel_steps FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ funnel_visits ============
DROP POLICY IF EXISTS "Members can delete workspace funnel visits" ON public.funnel_visits;
DROP POLICY IF EXISTS "Members can insert workspace funnel visits" ON public.funnel_visits;
DROP POLICY IF EXISTS "Members can view workspace funnel visits" ON public.funnel_visits;

CREATE POLICY "Members can view workspace funnel visits" ON public.funnel_visits FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnel visits" ON public.funnel_visits FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnel visits" ON public.funnel_visits FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ funnels ============
DROP POLICY IF EXISTS "Members can delete workspace funnels" ON public.funnels;
DROP POLICY IF EXISTS "Members can insert workspace funnels" ON public.funnels;
DROP POLICY IF EXISTS "Members can update workspace funnels" ON public.funnels;
DROP POLICY IF EXISTS "Members can view workspace funnels" ON public.funnels;

CREATE POLICY "Members can view workspace funnels" ON public.funnels FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnels" ON public.funnels FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace funnels" ON public.funnels FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnels" ON public.funnels FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ invitations ============
DROP POLICY IF EXISTS "Admin/owner can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin/owner can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin/owner can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Members can view invitations" ON public.invitations;

CREATE POLICY "Members can view invitations" ON public.invitations FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admin/owner can manage invitations" ON public.invitations FOR INSERT TO authenticated WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admin/owner can update invitations" ON public.invitations FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admin/owner can delete invitations" ON public.invitations FOR DELETE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

-- ============ lead_activities ============
DROP POLICY IF EXISTS "Members can delete workspace activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Members can insert workspace activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Members can view workspace activities" ON public.lead_activities;

CREATE POLICY "Members can view workspace activities" ON public.lead_activities FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace activities" ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace activities" ON public.lead_activities FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ lead_folder_leads ============
DROP POLICY IF EXISTS "Members can create workspace folder leads" ON public.lead_folder_leads;
DROP POLICY IF EXISTS "Members can delete workspace folder leads" ON public.lead_folder_leads;
DROP POLICY IF EXISTS "Members can view workspace folder leads" ON public.lead_folder_leads;

CREATE POLICY "Members can view workspace folder leads" ON public.lead_folder_leads FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can create workspace folder leads" ON public.lead_folder_leads FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace folder leads" ON public.lead_folder_leads FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ lead_folders ============
DROP POLICY IF EXISTS "Members can create workspace folders" ON public.lead_folders;
DROP POLICY IF EXISTS "Members can delete workspace folders" ON public.lead_folders;
DROP POLICY IF EXISTS "Members can update workspace folders" ON public.lead_folders;
DROP POLICY IF EXISTS "Members can view workspace folders" ON public.lead_folders;

CREATE POLICY "Members can view workspace folders" ON public.lead_folders FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can create workspace folders" ON public.lead_folders FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace folders" ON public.lead_folders FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace folders" ON public.lead_folders FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ leads ============
DROP POLICY IF EXISTS "Members can delete workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can insert workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can update workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can view workspace leads" ON public.leads;

CREATE POLICY "Members can view workspace leads" ON public.leads FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace leads" ON public.leads FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace leads" ON public.leads FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============ payment_events ============
DROP POLICY IF EXISTS "Service role can delete payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Service role can insert payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Service role can select payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Service role can update payment events" ON public.payment_events;

CREATE POLICY "Service role can select payment events" ON public.payment_events FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert payment events" ON public.payment_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update payment events" ON public.payment_events FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete payment events" ON public.payment_events FOR DELETE TO service_role USING (true);

-- ============ profiles ============
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============ subscriptions ============
DROP POLICY IF EXISTS "Admins can update any subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update any subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can insert subscriptions" ON public.subscriptions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update subscriptions" ON public.subscriptions FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete subscriptions" ON public.subscriptions FOR DELETE TO service_role USING (true);

-- ============ user_roles ============
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ workspace_members ============
DROP POLICY IF EXISTS "Admin/owner can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admin/owner can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admin/owner can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;

CREATE POLICY "Members can view workspace members" ON public.workspace_members FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admin/owner can insert members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (is_workspace_admin(auth.uid(), workspace_id) OR auth.uid() = user_id);
CREATE POLICY "Admin/owner can update members" ON public.workspace_members FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admin/owner can delete members" ON public.workspace_members FOR DELETE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

-- ============ workspaces ============
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owner/admin can update workspace" ON public.workspaces;

CREATE POLICY "Members can view their workspaces" ON public.workspaces FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner/admin can update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), id));
CREATE POLICY "Owner can delete workspace" ON public.workspaces FOR DELETE TO authenticated USING (owner_user_id = auth.uid());
