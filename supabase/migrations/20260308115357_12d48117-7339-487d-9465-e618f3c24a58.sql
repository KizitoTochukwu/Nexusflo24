
-- Sales conversations table: stores all AI sales closer messages
CREATE TABLE public.sales_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms', 'web_chat')),
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  message_body text NOT NULL,
  intent text CHECK (intent IN ('pricing_inquiry', 'objection', 'interest', 'ready_to_buy', 'question', 'unsubscribe', 'neutral', NULL)),
  intent_confidence real,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_model text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'pending_approval', 'sent', 'delivered', 'failed')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace sales_conversations"
  ON public.sales_conversations FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace sales_conversations"
  ON public.sales_conversations FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace sales_conversations"
  ON public.sales_conversations FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace sales_conversations"
  ON public.sales_conversations FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Service role policies for edge functions
CREATE POLICY "Service can insert sales_conversations"
  ON public.sales_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update sales_conversations"
  ON public.sales_conversations FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can select sales_conversations"
  ON public.sales_conversations FOR SELECT
  USING (true);

-- Sales closer settings per workspace
CREATE TABLE public.sales_closer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'auto_send' CHECK (mode IN ('auto_send', 'human_approval')),
  channels text[] NOT NULL DEFAULT '{email,whatsapp}'::text[],
  follow_up_enabled boolean NOT NULL DEFAULT true,
  follow_up_delay_hours integer NOT NULL DEFAULT 24,
  max_follow_ups integer NOT NULL DEFAULT 3,
  booking_page_id uuid REFERENCES public.booking_pages(id) ON DELETE SET NULL,
  system_prompt text DEFAULT '',
  escalation_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_closer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace sales_closer_settings"
  ON public.sales_closer_settings FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Admins can insert sales_closer_settings"
  ON public.sales_closer_settings FOR INSERT
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update sales_closer_settings"
  ON public.sales_closer_settings FOR UPDATE
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- Index for fast lookups
CREATE INDEX idx_sales_conversations_lead ON public.sales_conversations(lead_id, created_at DESC);
CREATE INDEX idx_sales_conversations_workspace ON public.sales_conversations(workspace_id, created_at DESC);

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_conversations;
