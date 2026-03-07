
-- booking_pages table
CREATE TABLE public.booking_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  duration_minutes integer NOT NULL DEFAULT 30,
  availability jsonb NOT NULL DEFAULT '{"mon":[{"start":"09:00","end":"17:00"}],"tue":[{"start":"09:00","end":"17:00"}],"wed":[{"start":"09:00","end":"17:00"}],"thu":[{"start":"09:00","end":"17:00"}],"fri":[{"start":"09:00","end":"17:00"}],"sat":[],"sun":[]}'::jsonb,
  timezone text NOT NULL DEFAULT 'UTC',
  buffer_minutes integer NOT NULL DEFAULT 15,
  max_days_ahead integer NOT NULL DEFAULT 30,
  description text DEFAULT '',
  color text DEFAULT '#D4AF37',
  status text NOT NULL DEFAULT 'active',
  google_calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES public.booking_pages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  google_event_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- booking_pages RLS: workspace members CRUD
CREATE POLICY "Members can view workspace booking_pages" ON public.booking_pages
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace booking_pages" ON public.booking_pages
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace booking_pages" ON public.booking_pages
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace booking_pages" ON public.booking_pages
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Public can view active booking pages by slug
CREATE POLICY "Public can view active booking_pages" ON public.booking_pages
  FOR SELECT USING (status = 'active');

-- bookings RLS: workspace members CRUD
CREATE POLICY "Members can view workspace bookings" ON public.bookings
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace bookings" ON public.bookings
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace bookings" ON public.bookings
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace bookings" ON public.bookings
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Public can insert bookings (guest submissions)
CREATE POLICY "Anyone can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

-- Public can view bookings for availability checking
CREATE POLICY "Anyone can view bookings for availability" ON public.bookings
  FOR SELECT USING (true);

-- Auto-generate slug trigger for booking_pages
CREATE OR REPLACE FUNCTION public.generate_booking_page_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '(^-|-$)', '', 'g');
    NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_booking_page_slug
BEFORE INSERT ON public.booking_pages
FOR EACH ROW EXECUTE FUNCTION public.generate_booking_page_slug();

-- Updated_at trigger
CREATE TRIGGER trg_booking_pages_updated_at
BEFORE UPDATE ON public.booking_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
