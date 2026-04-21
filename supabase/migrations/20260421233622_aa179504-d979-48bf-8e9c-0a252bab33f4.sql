-- ============================================================================
-- WORKFLOWS: top-level workflow definition
-- ============================================================================
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'draft', -- draft|active|paused|archived
  canvas_json jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  enrollment_config jsonb NOT NULL DEFAULT '{"reEnrollment":false,"reEnrollmentTriggers":[]}'::jsonb,
  suppression_config jsonb NOT NULL DEFAULT '{"tags":[],"lifecycleStages":[],"smartListIds":[]}'::jsonb,
  unenrollment_triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiet_hours jsonb NOT NULL DEFAULT '{"enabled":false,"start":"21:00","end":"08:00","timezone":"UTC"}'::jsonb,
  daily_send_cap integer NOT NULL DEFAULT 1000,
  goal_node_id text,
  template_slug text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_workspace_status ON public.workflows(workspace_id, status);
CREATE INDEX idx_workflows_workspace_updated ON public.workflows(workspace_id, updated_at DESC);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace workflows" ON public.workflows
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace workflows" ON public.workflows
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace workflows" ON public.workflows
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace workflows" ON public.workflows
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE TRIGGER trg_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- WORKFLOW_NODES: normalized executor view of the canvas
-- ============================================================================
CREATE TABLE public.workflow_nodes (
  id text NOT NULL, -- React Flow node id (string)
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_type text NOT NULL, -- trigger|action|condition|delay|merge|goal|end
  sub_type text, -- e.g. 'send_email', 'wait_delay', 'if_email_opened'
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_node_id text,
  branch text NOT NULL DEFAULT 'main', -- main|yes|no
  step_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (workflow_id, id)
);

CREATE INDEX idx_workflow_nodes_workflow ON public.workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_parent ON public.workflow_nodes(workflow_id, parent_node_id);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace workflow_nodes" ON public.workflow_nodes
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace workflow_nodes" ON public.workflow_nodes
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace workflow_nodes" ON public.workflow_nodes
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace workflow_nodes" ON public.workflow_nodes
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============================================================================
-- WORKFLOW_ENROLLMENTS: each lead's journey through a workflow
-- ============================================================================
CREATE TABLE public.workflow_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active', -- active|completed|exited|suppressed|errored
  current_node_id text,
  branch_path jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of node ids visited
  steps_executed integer NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  exit_reason text,
  last_step_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Prevent duplicate active (non-test) enrollments per lead+workflow
CREATE UNIQUE INDEX idx_workflow_enrollments_active_unique
  ON public.workflow_enrollments(workflow_id, lead_id)
  WHERE status = 'active' AND is_test = false;

CREATE INDEX idx_workflow_enrollments_workflow_status ON public.workflow_enrollments(workflow_id, status);
CREATE INDEX idx_workflow_enrollments_lead ON public.workflow_enrollments(lead_id);
CREATE INDEX idx_workflow_enrollments_workspace ON public.workflow_enrollments(workspace_id);

ALTER TABLE public.workflow_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace workflow_enrollments" ON public.workflow_enrollments
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage workflow_enrollments" ON public.workflow_enrollments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Members can insert workspace workflow_enrollments" ON public.workflow_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace workflow_enrollments" ON public.workflow_enrollments
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- ============================================================================
-- WORKFLOW_RUNS: per-step execution log
-- ============================================================================
CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.workflow_enrollments(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  node_id text NOT NULL,
  node_type text NOT NULL,
  branch_taken text, -- 'yes' | 'no' | null
  status text NOT NULL DEFAULT 'success', -- success|failed|skipped|pending
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  is_test boolean NOT NULL DEFAULT false,
  ran_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_enrollment ON public.workflow_runs(enrollment_id, ran_at);
CREATE INDEX idx_workflow_runs_workflow_node ON public.workflow_runs(workflow_id, node_id);
CREATE INDEX idx_workflow_runs_workspace ON public.workflow_runs(workspace_id, ran_at DESC);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace workflow_runs" ON public.workflow_runs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage workflow_runs" ON public.workflow_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- WORKFLOW_LOGS: aggregate event log
-- ============================================================================
CREATE TABLE public.workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.workflow_enrollments(id) ON DELETE SET NULL,
  lead_id uuid,
  event_type text NOT NULL, -- enrolled|completed|exited|suppressed|errored|node_executed|branch_taken
  level text NOT NULL DEFAULT 'info', -- info|warn|error
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_logs_workflow ON public.workflow_logs(workflow_id, created_at DESC);
CREATE INDEX idx_workflow_logs_workspace ON public.workflow_logs(workspace_id, created_at DESC);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace workflow_logs" ON public.workflow_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage workflow_logs" ON public.workflow_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- WORKFLOW_TEMPLATES: prebuilt templates (public read, admin write)
-- ============================================================================
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text DEFAULT '',
  canvas_json jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  enrollment_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_templates_featured ON public.workflow_templates(is_featured, sort_order);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workflow_templates" ON public.workflow_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workflow_templates" ON public.workflow_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- LEAD_SCORE_HISTORY: every score change
-- ============================================================================
CREATE TABLE public.lead_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  previous_score integer NOT NULL DEFAULT 0,
  new_score integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual', -- workflow|automation|event|manual
  ref_type text,
  ref_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_score_history_lead ON public.lead_score_history(lead_id, created_at DESC);
CREATE INDEX idx_lead_score_history_workspace ON public.lead_score_history(workspace_id, created_at DESC);

ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace lead_score_history" ON public.lead_score_history
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can manage lead_score_history" ON public.lead_score_history
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Members can insert workspace lead_score_history" ON public.lead_score_history
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));