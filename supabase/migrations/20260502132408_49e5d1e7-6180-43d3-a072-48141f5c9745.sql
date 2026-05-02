-- Add Meta share tracking columns to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS facebook_post_id text,
  ADD COLUMN IF NOT EXISTS facebook_shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS facebook_share_error text,
  ADD COLUMN IF NOT EXISTS instagram_post_id text,
  ADD COLUMN IF NOT EXISTS instagram_shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_share_error text;

-- Replace dispatch trigger function to also fire share-to-meta
CREATE OR REPLACE FUNCTION public.dispatch_blog_linkedin_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN

    -- LinkedIn (existing)
    IF NEW.linkedin_shared_at IS NULL THEN
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
        RAISE WARNING 'dispatch linkedin failed: %', SQLERRM;
      END;
    END IF;

    -- Meta (Facebook + Instagram)
    IF NEW.facebook_shared_at IS NULL OR NEW.instagram_shared_at IS NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/share-to-meta',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC5pMk8xUUE',
            'x-internal-trigger', 'blog-publish'
          ),
          body := jsonb_build_object('post_id', NEW.id)
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'dispatch meta failed: %', SQLERRM;
      END;
    END IF;

  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached (it already references this function, but make idempotent)
DROP TRIGGER IF EXISTS trg_dispatch_blog_linkedin_share ON public.blog_posts;
CREATE TRIGGER trg_dispatch_blog_linkedin_share
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_blog_linkedin_share();