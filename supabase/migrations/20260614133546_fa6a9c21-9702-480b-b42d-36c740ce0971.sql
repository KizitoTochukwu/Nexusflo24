
-- 1) Blog: drop public table policy, add safe RPCs
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;

CREATE OR REPLACE FUNCTION public.get_public_blog_posts()
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  category text,
  author text,
  image_url text,
  read_time text,
  featured boolean,
  published_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, slug, excerpt, category, author, image_url, read_time, featured, published_at, created_at
  FROM public.blog_posts
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_public_blog_post(p_slug text)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  category text,
  author text,
  image_url text,
  read_time text,
  featured boolean,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, slug, excerpt, content, category, author, image_url, read_time, featured, published_at, created_at, updated_at
  FROM public.blog_posts
  WHERE status = 'published' AND slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_blog_post(text) TO anon, authenticated;

-- 2) Funnels: drop public table policy, add safe slug lookup RPC
DROP POLICY IF EXISTS "Public can view active funnels" ON public.funnels;

CREATE OR REPLACE FUNCTION public.get_public_funnel_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  slug text,
  workspace_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, status, slug, workspace_id
  FROM public.funnels
  WHERE slug = p_slug AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_funnel_by_slug(text) TO anon, authenticated;

-- 3) Remove sensitive message tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.sms_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_logs;
