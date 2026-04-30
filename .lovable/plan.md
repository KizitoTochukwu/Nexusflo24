# Auto-share new blog posts to LinkedIn

## Current state (already built)

`AdminBlogManager.tsx` already calls the `share-to-linkedin` edge function automatically the first time a post transitions to `status = 'published'`. The edge function uses `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_PERSON_URN` secrets (already configured) and posts via LinkedIn's `/rest/posts` API with the article URL, title, excerpt, and cover image.

So the basic workflow exists. What's missing is **reliability, visibility, and control**.

## What this plan adds

### 1. Reliability — DB trigger as fallback
The current share only fires from the admin UI. If a post is published via SQL, API, or scheduled publish later, it won't share. Add a Postgres trigger on `blog_posts` that calls `share-to-linkedin` via `pg_net` when `status` changes to `published` and `linkedin_shared_at` is null.

### 2. Visibility — share log
Add columns to `blog_posts`:
- `linkedin_shared_at timestamptz`
- `linkedin_post_id text`
- `linkedin_share_error text`

Edge function writes back success/failure to these columns (using service role) so admins can see status.

### 3. Control — UI affordances in Blog Manager
- Show a "Shared to LinkedIn ✓" badge (with timestamp) on rows where `linkedin_shared_at` is set.
- Add a "Share to LinkedIn" / "Re-share" action in the row menu for manual trigger or retry on failure.
- Show error tooltip if `linkedin_share_error` exists.

### 4. Safety
- Trigger uses `linkedin_shared_at IS NULL` guard so it never double-posts.
- Manual re-share clears `linkedin_shared_at` first, then calls the function.
- Edge function continues to require an authenticated admin for manual calls; the DB trigger uses the service role via `pg_net`.

## Technical details

**Migration**
```sql
ALTER TABLE public.blog_posts
  ADD COLUMN linkedin_shared_at timestamptz,
  ADD COLUMN linkedin_post_id text,
  ADD COLUMN linkedin_share_error text;

CREATE OR REPLACE FUNCTION public.dispatch_blog_linkedin_share()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published')
     AND NEW.linkedin_shared_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/share-to-linkedin',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer <SERVICE_ROLE>'
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_blog_linkedin_share
AFTER INSERT OR UPDATE OF status ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.dispatch_blog_linkedin_share();
```

**Edge function changes (`share-to-linkedin`)**
- Accept either `{ title, excerpt, url, image_url }` (current admin UI) **or** `{ post_id }` (DB trigger). When `post_id` is provided, load the row with the service role and build the payload server-side.
- Switch auth: allow either an authenticated admin user OR a service-role caller (for the DB trigger).
- After a successful LinkedIn POST, update `blog_posts` with `linkedin_shared_at`, `linkedin_post_id`, and clear `linkedin_share_error`.
- On failure, write `linkedin_share_error` and return the existing error response.

**UI changes (`AdminBlogManager.tsx`)**
- Select the new columns in the posts query.
- Add a small "LinkedIn ✓ {date}" badge next to the status badge when shared.
- Add a "Share to LinkedIn" menu/button per row that calls the function with `{ post_id }` (and clears prior `linkedin_shared_at` for re-share).
- Surface `linkedin_share_error` via tooltip on a warning icon if present.

## Out of scope (ask if you want any of these)
- Posting to a LinkedIn **Company Page** instead of personal profile (requires `LINKEDIN_PERSON_URN` to be the org URN like `urn:li:organization:123` and the access token to have `w_organization_social` scope).
- Scheduling shares for a specific time of day.
- Cross-posting to Facebook / Instagram / X.
