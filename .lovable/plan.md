# Fix LinkedIn duplicate-post errors

## Root cause

The first share already succeeded — LinkedIn's logs show a real post URN was returned (`urn:li:share:7455757413883789312`). Every retry after that returns **422 DUPLICATE_POST** because LinkedIn refuses to publish identical content.

So this isn't really a failure — the post is already live on your NexusFlo24 LinkedIn page. We just need to:

1. **Treat 422 duplicate as success** — mark the post as shared and store the existing LinkedIn URN so the UI shows ✓ Shared.
2. **Make manual re-shares actually different** — append a small unique marker (date hashtag) to the commentary so LinkedIn accepts it as a new post.

## Change

Edit `supabase/functions/share-to-linkedin/index.ts`:

- After a non-OK LinkedIn response, detect `status === 422` with `DUPLICATE_POST` in the body.
  - Extract the existing `urn:li:share:...` from the error message.
  - Update `blog_posts` row with `linkedin_shared_at = now()`, `linkedin_post_id = <extracted urn>`, clear `linkedin_share_error`.
  - Return `{ success: true, duplicate: true }` (200) instead of 502.
- When the request body has `reshare: true` (manual re-share from the admin button), append `\n\n#<YYYYMMDD>` to the commentary so the content differs from prior posts.

The Blog Manager UI already passes `reshare: true` when the user clicks the LinkedIn icon on an already-shared post — no UI change needed.

## Result

- The first auto-share that already happened will retroactively show as ✓ Shared once you click re-share once (or it'll auto-resolve next time the trigger fires).
- Manual re-shares will succeed because the commentary differs.
- Genuine LinkedIn errors (auth, malformed payload, etc.) still surface as failures.
