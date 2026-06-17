-- Restrict regional_prices reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read regional_prices" ON public.regional_prices;
CREATE POLICY "Authenticated users can read regional_prices"
  ON public.regional_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow public read of published blog posts (drafts still admin-only via existing ALL policy)
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');