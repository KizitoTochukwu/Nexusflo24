CREATE TABLE public.store_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug TEXT NOT NULL,
  project_id UUID REFERENCES public.store_projects(id) ON DELETE SET NULL,
  user_id UUID,
  author_name TEXT NOT NULL,
  business_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  body TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

GRANT SELECT ON public.store_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_reviews TO authenticated;
GRANT ALL ON public.store_reviews TO service_role;

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published reviews are public"
  ON public.store_reviews FOR SELECT
  USING (is_published = true);

CREATE POLICY "Customers read their own reviews"
  ON public.store_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all reviews"
  ON public.store_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers submit their own reviews"
  ON public.store_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_published = false
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.store_projects p
        WHERE p.id = project_id AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers edit their unpublished reviews"
  ON public.store_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_published = false)
  WITH CHECK (user_id = auth.uid() AND is_published = false);

CREATE POLICY "Admins manage reviews"
  ON public.store_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_store_reviews_product ON public.store_reviews (product_slug, is_published);

CREATE TRIGGER trg_store_reviews_updated_at
  BEFORE UPDATE ON public.store_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();