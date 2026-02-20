
-- Create leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  source text DEFAULT 'Organic',
  score int DEFAULT 0,
  status text DEFAULT 'New',
  tags text[] DEFAULT '{}',
  notes text,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique email per user
CREATE UNIQUE INDEX idx_leads_user_email ON public.leads(user_id, email) WHERE email IS NOT NULL AND email != '';

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create lead_activities table
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead activities" ON public.lead_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lead activities" ON public.lead_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead activities" ON public.lead_activities FOR DELETE USING (auth.uid() = user_id);

-- Function to update last_activity_at on leads when activity is created
CREATE OR REPLACE FUNCTION public.update_lead_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads SET last_activity_at = NEW.created_at WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_activity_update_last
AFTER INSERT ON public.lead_activities
FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_activity();
