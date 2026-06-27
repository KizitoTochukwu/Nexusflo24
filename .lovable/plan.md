## Issue
Make.com is getting `NOT_FOUND` from `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/blog-ingest`. The `blog-ingest` function exists in the codebase but is not deployed (or was never registered in `supabase/config.toml`).

## Fix
1. Add `blog-ingest` entry to `supabase/config.toml` with `verify_jwt = false` (auth is handled via custom `x-api-key` header inside the function).
2. Deploy the `blog-ingest` edge function.
3. Test the live endpoint with a curl call to confirm it now returns a proper response (e.g., 401 without key, 200 with valid key) instead of `NOT_FOUND`.
4. Report back to user so they can re-run the Make.com scenario.