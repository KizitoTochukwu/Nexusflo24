-- 1. AI CONVERSATIONS
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  route text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view workspace ai conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members create own ai conversations" ON public.ai_conversations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners update own ai conversations" ON public.ai_conversations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete own ai conversations" ON public.ai_conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_ai_conversations_ws_user ON public.ai_conversations(workspace_id, user_id, updated_at DESC);
CREATE TRIGGER trg_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. AI MESSAGES
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  structured jsonb NOT NULL DEFAULT '{}'::jsonb,
  capability text,
  model text,
  tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view workspace ai messages" ON public.ai_messages
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert ai messages" ON public.ai_messages
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members delete ai messages" ON public.ai_messages
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
CREATE TRIGGER trg_ai_messages_updated_at BEFORE UPDATE ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. AI FEEDBACK
CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ai feedback" ON public.ai_feedback
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Users create own ai feedback" ON public.ai_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Users update own ai feedback" ON public.ai_feedback
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own ai feedback" ON public.ai_feedback
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_ai_feedback_updated_at BEFORE UPDATE ON public.ai_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. AI PROPOSED ACTIONS
CREATE TABLE public.ai_proposed_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  title text NOT NULL,
  summary text,
  target_table text,
  target_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','awaiting_confirmation','confirmed','processing','completed','failed','cancelled')),
  error text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_proposed_actions TO authenticated;
GRANT ALL ON public.ai_proposed_actions TO service_role;
ALTER TABLE public.ai_proposed_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ai proposed actions" ON public.ai_proposed_actions
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members create ai proposed actions" ON public.ai_proposed_actions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update ai proposed actions" ON public.ai_proposed_actions
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members delete own ai proposed actions" ON public.ai_proposed_actions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_ai_proposed_actions_ws ON public.ai_proposed_actions(workspace_id, status, created_at DESC);
CREATE TRIGGER trg_ai_proposed_actions_updated_at BEFORE UPDATE ON public.ai_proposed_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. AI ACTION AUDIT
CREATE TABLE public.ai_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  action_id uuid REFERENCES public.ai_proposed_actions(id) ON DELETE SET NULL,
  user_id uuid,
  action_type text NOT NULL,
  target_table text,
  target_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  result text NOT NULL DEFAULT 'completed',
  undo_available boolean NOT NULL DEFAULT false,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_action_audit TO authenticated;
GRANT ALL ON public.ai_action_audit TO service_role;
ALTER TABLE public.ai_action_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ai audit" ON public.ai_action_audit
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert ai audit" ON public.ai_action_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update ai audit" ON public.ai_action_audit
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_ai_action_audit_ws ON public.ai_action_audit(workspace_id, created_at DESC);

-- 6. AI LEAD SCORES (explainability layer)
CREATE TABLE public.ai_lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  band text,
  confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low','medium','high')),
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  model text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_lead_scores TO authenticated;
GRANT ALL ON public.ai_lead_scores TO service_role;
ALTER TABLE public.ai_lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ai lead scores" ON public.ai_lead_scores
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members write ai lead scores" ON public.ai_lead_scores
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members update ai lead scores" ON public.ai_lead_scores
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members delete ai lead scores" ON public.ai_lead_scores
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_ai_lead_scores_updated_at BEFORE UPDATE ON public.ai_lead_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. AI USAGE
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  capability text NOT NULL,
  model text,
  tokens integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ai usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_ai_usage_ws_created ON public.ai_usage(workspace_id, created_at DESC);