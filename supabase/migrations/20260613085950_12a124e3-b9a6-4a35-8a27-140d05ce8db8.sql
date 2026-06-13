
-- =========================================
-- WHITE-LABEL COMMUNICATION INFRASTRUCTURE
-- =========================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.sender_channel AS ENUM ('whatsapp','sms','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sender_status AS ENUM ('pending','approved','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- sender_profiles ----
CREATE TABLE IF NOT EXISTS public.sender_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel public.sender_channel NOT NULL,
  label text NOT NULL,
  display_name text NOT NULL,
  address text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  status public.sender_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sender_profiles_workspace_idx ON public.sender_profiles(workspace_id, channel);
CREATE INDEX IF NOT EXISTS sender_profiles_status_idx ON public.sender_profiles(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sender_profiles TO authenticated;
GRANT ALL ON public.sender_profiles TO service_role;
ALTER TABLE public.sender_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace sender profiles" ON public.sender_profiles
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workspace admins can insert sender profiles" ON public.sender_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workspace admins can update sender profiles" ON public.sender_profiles
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workspace admins can delete sender profiles" ON public.sender_profiles
  FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sender_profiles_updated_at
  BEFORE UPDATE ON public.sender_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- whatsapp_senders ----
CREATE TABLE IF NOT EXISTS public.whatsapp_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL UNIQUE REFERENCES public.sender_profiles(id) ON DELETE CASCADE,
  business_name text,
  phone_number text,
  website text,
  category text,
  address text,
  meta_business_id text,
  twilio_wa_sender_sid text,
  approved_sender_name text,
  verification_status text DEFAULT 'unverified',
  provider text NOT NULL DEFAULT 'twilio',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_senders TO authenticated;
GRANT ALL ON public.whatsapp_senders TO service_role;
ALTER TABLE public.whatsapp_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view via sender profile" ON public.whatsapp_senders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sender_profiles sp
            WHERE sp.id = sender_profile_id
              AND (public.is_workspace_member(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Workspace admins manage wa sender" ON public.whatsapp_senders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sender_profiles sp
                 WHERE sp.id = sender_profile_id
                   AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sender_profiles sp
                      WHERE sp.id = sender_profile_id
                        AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER trg_wa_senders_updated_at
  BEFORE UPDATE ON public.whatsapp_senders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- sms_senders ----
CREATE TABLE IF NOT EXISTS public.sms_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL UNIQUE REFERENCES public.sender_profiles(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'shared',
  display_name text,
  phone_number text,
  country text,
  verification_status text DEFAULT 'unverified',
  monthly_fee_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_senders TO authenticated;
GRANT ALL ON public.sms_senders TO service_role;
ALTER TABLE public.sms_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view via sender profile" ON public.sms_senders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sender_profiles sp
            WHERE sp.id = sender_profile_id
              AND (public.is_workspace_member(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Workspace admins manage sms sender" ON public.sms_senders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sender_profiles sp
                 WHERE sp.id = sender_profile_id
                   AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sender_profiles sp
                      WHERE sp.id = sender_profile_id
                        AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER trg_sms_senders_updated_at
  BEFORE UPDATE ON public.sms_senders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- email_senders ----
CREATE TABLE IF NOT EXISTS public.email_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL UNIQUE REFERENCES public.sender_profiles(id) ON DELETE CASCADE,
  from_name text,
  from_email text,
  reply_to text,
  domain text,
  dkim_status text DEFAULT 'pending',
  spf_status text DEFAULT 'pending',
  dmarc_status text DEFAULT 'pending',
  verification_status text DEFAULT 'unverified',
  provider text NOT NULL DEFAULT 'resend',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_senders TO authenticated;
GRANT ALL ON public.email_senders TO service_role;
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view via sender profile" ON public.email_senders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sender_profiles sp
            WHERE sp.id = sender_profile_id
              AND (public.is_workspace_member(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Workspace admins manage email sender" ON public.email_senders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sender_profiles sp
                 WHERE sp.id = sender_profile_id
                   AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sender_profiles sp
                      WHERE sp.id = sender_profile_id
                        AND (public.is_workspace_admin(auth.uid(), sp.workspace_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER trg_email_senders_updated_at
  BEFORE UPDATE ON public.email_senders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- communication_usage ----
CREATE TABLE IF NOT EXISTS public.communication_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_profile_id uuid REFERENCES public.sender_profiles(id) ON DELETE SET NULL,
  channel public.sender_channel NOT NULL,
  message_id text,
  country text,
  credits_deducted integer NOT NULL DEFAULT 1,
  cost_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comm_usage_workspace_idx ON public.communication_usage(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comm_usage_channel_idx ON public.communication_usage(channel, created_at DESC);

GRANT SELECT ON public.communication_usage TO authenticated;
GRANT ALL ON public.communication_usage TO service_role;
ALTER TABLE public.communication_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace usage" ON public.communication_usage
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

-- ---- credit_packages ----
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.sender_channel NOT NULL,
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  stripe_price_id text,
  country text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT ALL ON public.credit_packages TO service_role;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views active packages" ON public.credit_packages
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages packages" ON public.credit_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_credit_packages_updated_at
  BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- credit_pricing_rules ----
CREATE TABLE IF NOT EXISTS public.credit_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.sender_channel NOT NULL,
  country text,
  credits_per_message integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel, country)
);
GRANT SELECT ON public.credit_pricing_rules TO authenticated;
GRANT ALL ON public.credit_pricing_rules TO service_role;
ALTER TABLE public.credit_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views pricing" ON public.credit_pricing_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages pricing" ON public.credit_pricing_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_credit_pricing_rules_updated_at
  BEFORE UPDATE ON public.credit_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default pricing rules (no country = default rate)
INSERT INTO public.credit_pricing_rules (channel, country, credits_per_message)
VALUES ('whatsapp', NULL, 1), ('sms', NULL, 1), ('email', NULL, 1)
ON CONFLICT (channel, country) DO NOTHING;

-- ---- wallet_settings ----
CREATE TABLE IF NOT EXISTS public.wallet_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  low_balance_threshold integer NOT NULL DEFAULT 20,
  auto_topup_enabled boolean NOT NULL DEFAULT false,
  auto_topup_package_id uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  auto_topup_min_balance integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_settings TO authenticated;
GRANT ALL ON public.wallet_settings TO service_role;
ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view wallet settings" ON public.wallet_settings
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workspace admins manage wallet settings" ON public.wallet_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallet_settings_updated_at
  BEFORE UPDATE ON public.wallet_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- traceability columns on existing message tables ----
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sender_profile_id uuid REFERENCES public.sender_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sender_profile_id uuid REFERENCES public.sender_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS sender_profile_id uuid REFERENCES public.sender_profiles(id) ON DELETE SET NULL;
