
-- Add slug column to funnels
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS funnels_slug_unique ON public.funnels (slug) WHERE slug IS NOT NULL;

-- Auto-generate slug from name on insert if not provided
CREATE OR REPLACE FUNCTION public.generate_funnel_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '(^-|-$)', '', 'g');
    -- Append short random suffix to avoid collisions
    NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_funnel_slug
BEFORE INSERT ON public.funnels
FOR EACH ROW
EXECUTE FUNCTION public.generate_funnel_slug();

-- Public SELECT policy: anyone can read active funnels (for public rendering)
CREATE POLICY "Public can view active funnels"
ON public.funnels
FOR SELECT
USING (status = 'active');

-- Public SELECT policy for funnel_steps of active funnels
CREATE POLICY "Public can view steps of active funnels"
ON public.funnel_steps
FOR SELECT
USING (funnel_id IN (SELECT id FROM public.funnels WHERE status = 'active'));

-- Public INSERT policy for funnel_visits (anonymous visitors tracking)
CREATE POLICY "Anyone can insert funnel visits"
ON public.funnel_visits
FOR INSERT
WITH CHECK (true);
