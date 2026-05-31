
-- profiles: preferred currency
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD';

-- credit_transactions: capture charge currency for receipts/history
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS amount_minor integer;

-- subscriptions: multi-provider + currency
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS amount_minor integer;

-- regional_prices
CREATE TABLE IF NOT EXISTS public.regional_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,            -- 'starter' | 'plus' | 'pro' | 'enterprise' | 'credit_email' | 'credit_sms' | 'credit_whatsapp'
  billing_cycle text NOT NULL,       -- 'monthly' | 'yearly' | 'one_time'
  currency text NOT NULL,            -- 'USD' | 'GBP' | 'EUR' | 'NGN'
  amount_minor integer NOT NULL,     -- minor units (cents / pence / kobo)
  stripe_price_id text,
  paystack_plan_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_key, billing_cycle, currency)
);

GRANT SELECT ON public.regional_prices TO anon;
GRANT SELECT ON public.regional_prices TO authenticated;
GRANT ALL ON public.regional_prices TO service_role;

ALTER TABLE public.regional_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read regional_prices"
  ON public.regional_prices FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert regional_prices"
  ON public.regional_prices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update regional_prices"
  ON public.regional_prices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete regional_prices"
  ON public.regional_prices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER regional_prices_updated_at
  BEFORE UPDATE ON public.regional_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- currency_rates (base USD)
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'USD',
  quote text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base, quote)
);

GRANT SELECT ON public.currency_rates TO anon;
GRANT SELECT ON public.currency_rates TO authenticated;
GRANT ALL ON public.currency_rates TO service_role;

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read currency_rates"
  ON public.currency_rates FOR SELECT USING (true);

CREATE POLICY "Admins can write currency_rates"
  ON public.currency_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER currency_rates_updated_at
  BEFORE UPDATE ON public.currency_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rates (USD base)
INSERT INTO public.currency_rates (base, quote, rate) VALUES
  ('USD', 'USD', 1),
  ('USD', 'GBP', 0.79),
  ('USD', 'EUR', 0.92),
  ('USD', 'NGN', 1600)
ON CONFLICT (base, quote) DO NOTHING;

-- Seed regional_prices with existing USD plan prices so the admin UI has something to start from.
-- Plans: starter $15, plus $39, pro $79, enterprise $199 (monthly); yearly = monthly*12*0.8.
INSERT INTO public.regional_prices (plan_key, billing_cycle, currency, amount_minor, stripe_price_id, active) VALUES
  ('starter',    'monthly', 'USD',  1500,  'price_1T9mXPE524oup9rkk8iIwV9V', true),
  ('starter',    'yearly',  'USD', 14400,  'price_1T9mYOE524oup9rkkZdWRQFx', true),
  ('plus',       'monthly', 'USD',  3900,  'price_1T9marE524oup9rkld15YfyQ', true),
  ('plus',       'yearly',  'USD', 37440,  'price_1T9mbVE524oup9rkVF3I4II2', true),
  ('pro',        'monthly', 'USD',  7900,  'price_1T9mcBE524oup9rkNpX4MfLj', true),
  ('pro',        'yearly',  'USD', 75840,  'price_1T9mdJE524oup9rkt4IgzlT6', true),
  ('enterprise', 'monthly', 'USD', 19900,  'price_1T9mf7E524oup9rkAFzF9Yae', true),
  ('enterprise', 'yearly',  'USD', 191040, 'price_1T9mfeE524oup9rk66YsGrWs', true),
  ('credit_email',    'one_time', 'USD', 500, 'price_1TOfYVE524oup9rkOupWd3vN', true),
  ('credit_sms',      'one_time', 'USD', 500, 'price_1TOfc8E524oup9rkWQWIhwrf', true),
  ('credit_whatsapp', 'one_time', 'USD', 500, 'price_1TOfeBE524oup9rkcPlroL47', true)
ON CONFLICT (plan_key, billing_cycle, currency) DO NOTHING;
