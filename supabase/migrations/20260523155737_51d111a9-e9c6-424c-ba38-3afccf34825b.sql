
-- 1) Fix lead_folder_leads UPDATE policy role: public -> authenticated
DROP POLICY IF EXISTS "Members can update workspace folder leads" ON public.lead_folder_leads;
CREATE POLICY "Members can update workspace folder leads"
  ON public.lead_folder_leads
  FOR UPDATE
  TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- 2) workspace_tracking_pixels: stop exposing whole table publicly.
--    Replace with a SECURITY DEFINER function that returns only non-secret pixel IDs for a given workspace.
DROP POLICY IF EXISTS "Public can read tracking pixels" ON public.workspace_tracking_pixels;
CREATE POLICY "Workspace members can read tracking pixels"
  ON public.workspace_tracking_pixels
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.get_workspace_public_pixels(p_workspace_id uuid)
RETURNS TABLE (
  meta_pixel_id text,
  meta_enabled boolean,
  ga4_measurement_id text,
  ga4_enabled boolean,
  gtm_id text,
  gtm_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_pixel_id, meta_enabled, ga4_measurement_id, ga4_enabled, gtm_id, gtm_enabled
  FROM public.workspace_tracking_pixels
  WHERE workspace_id = p_workspace_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_public_pixels(uuid) TO anon, authenticated;

-- 3) booking_pages: stop exposing entire row (incl. google_token_id, user_id, workspace_id, internal config) publicly.
DROP POLICY IF EXISTS "Public can view active booking_pages" ON public.booking_pages;

-- Safe public lookup by slug for the public booking page
CREATE OR REPLACE FUNCTION public.get_public_booking_page(p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  description text,
  duration_minutes integer,
  buffer_minutes integer,
  max_days_ahead integer,
  color text,
  location_type text,
  location_value text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, description, duration_minutes, buffer_minutes,
         max_days_ahead, color, location_type, location_value, status
  FROM public.booking_pages
  WHERE slug = p_slug AND status = 'active'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_booking_page(text) TO anon, authenticated;

-- Safe public lookup by id (used by funnel BookingButton to resolve slug)
CREATE OR REPLACE FUNCTION public.get_public_booking_slug(p_id uuid)
RETURNS TABLE (slug text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, status
  FROM public.booking_pages
  WHERE id = p_id AND status = 'active'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_booking_slug(uuid) TO anon, authenticated;
