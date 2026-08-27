-- Blog post scheduled publishing
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS blog_posts_scheduled_for_idx ON public.blog_posts (scheduled_for) WHERE scheduled_for IS NOT NULL AND status = 'scheduled';

-- Publishes any scheduled posts whose time has passed. Safe to run repeatedly.
CREATE OR REPLACE FUNCTION public.publish_due_blog_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.blog_posts
  SET status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_due_blog_posts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_due_blog_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_blog_posts() TO service_role;

-- Last sign-in per active platform staff member, for access reviews.
CREATE OR REPLACE FUNCTION public.platform_staff_last_sign_in()
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT psa.user_id, u.last_sign_in_at
  FROM public.platform_staff_assignments psa
  JOIN auth.users u ON u.id = psa.user_id
  WHERE psa.is_active = true
    AND public.is_platform_staff(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.platform_staff_last_sign_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_staff_last_sign_in() TO authenticated;