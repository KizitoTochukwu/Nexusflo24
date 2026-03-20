
-- message_credits: per-workspace credit balances
CREATE TABLE public.message_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  email_balance integer NOT NULL DEFAULT 0,
  sms_balance integer NOT NULL DEFAULT 0,
  whatsapp_balance integer NOT NULL DEFAULT 0,
  email_used integer NOT NULL DEFAULT 0,
  sms_used integer NOT NULL DEFAULT 0,
  whatsapp_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_credits ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace credits
CREATE POLICY "Members can view workspace credits"
  ON public.message_credits FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Service role can manage credits
CREATE POLICY "Service can insert credits"
  ON public.message_credits FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can update credits"
  ON public.message_credits FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- credit_transactions: audit log
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace transactions
CREATE POLICY "Members can view workspace credit_transactions"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Service role can insert transactions
CREATE POLICY "Service can insert credit_transactions"
  ON public.credit_transactions FOR INSERT TO service_role
  WITH CHECK (true);

-- Auto-update updated_at on message_credits
CREATE TRIGGER update_message_credits_updated_at
  BEFORE UPDATE ON public.message_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
