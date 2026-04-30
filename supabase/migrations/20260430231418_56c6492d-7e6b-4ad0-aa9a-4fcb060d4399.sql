-- Track LinkedIn share state on blog posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS linkedin_shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS linkedin_post_id text,
  ADD COLUMN IF NOT EXISTS linkedin_share_error text;

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: dispatch LinkedIn share on first publish
CREATE OR REPLACE FUNCTION public.dispatch_blog_linkedin_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NEW.linkedin_shared_at IS NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/share-to-linkedin',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC5pMk8xUUE',
          'x-internal-trigger', 'blog-publish'
        ),
        body := jsonb_build_object('post_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'dispatch_blog_linkedin_share failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_linkedin_share ON public.blog_posts;
CREATE TRIGGER trg_blog_linkedin_share
AFTER INSERT OR UPDATE OF status ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.dispatch_blog_linkedin_share();