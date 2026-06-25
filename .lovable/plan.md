# Automate Blog Posts from Make.com

Build an inbound endpoint that lets Make.com create blog posts in NexusFlo24, authenticated by per-workspace API keys you generate in Settings.

## What gets built

### 1. Database
New migration:
- `workspace_api_keys` table: `id`, `workspace_id`, `name`, `key_hash` (sha256), `key_prefix` (first 8 chars for display), `scopes` (text[], e.g. `['blog:write']`), `created_by`, `last_used_at`, `created_at`, `revoked_at`.
- RLS: workspace admins can list/create/revoke; service_role full access. GRANTs included.
- Helper RPC `verify_api_key(_hash)` → returns `workspace_id` + `scopes` if active.

### 2. Edge function: `blog-ingest` (public, `verify_jwt=false`)
- `POST /functions/v1/blog-ingest`
- Auth: header `x-api-key: nfk_live_...`. Hash it, look up workspace, check `blog:write` scope.
- Body (zod-validated):
  ```
  { title, slug?, content, excerpt?, image_url?, category?, author?, status? ("draft"|"published"), featured?, read_time? }
  ```
- Behavior:
  - Auto-generate `slug` if missing (slugify + 6-char suffix), enforce uniqueness.
  - If `status: "published"` and `published_at` empty → set to `now()` (existing `dispatch_blog_linkedin_share` trigger then fans out to LinkedIn/Meta automatically — bonus).
  - Insert into `blog_posts` with `workspace_id`.
  - Return `{ id, slug, public_url, status }`.
- Idempotency: optional `x-idempotency-key` header → if a post with that key exists in the last 24h, return the same record (stored in `blog_posts.meta` jsonb if available, else a tiny `blog_ingest_keys` table).
- CORS + structured error responses.

### 3. Settings UI: API Keys tab
New tab under `Settings → Integrations → API Keys`:
- List existing keys (name, prefix `nfk_live_abcd1234…`, created date, last used, revoke button).
- "Generate new key" dialog → choose name + scopes (just `blog:write` for now). Shows full key **once** with copy button + warning "you won't see this again".
- Admin-only (uses `is_workspace_admin`).

### 4. Make.com setup docs
Add a short docs panel in the API Keys tab showing the user exactly what to paste into Make's HTTP module:
- URL: `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/blog-ingest`
- Method: POST
- Headers: `x-api-key: <their key>`, `Content-Type: application/json`
- Sample JSON body with all supported fields
- Common Make scenarios: RSS → Blog, OpenAI → Blog, Google Sheets → Blog, Notion → Blog

## Out of scope (this round)
- Update/delete endpoints (can add later — same auth pattern)
- Image upload via URL fetch (Make can pass a public image URL into `image_url` directly)
- Webhook back to Make on publish (separate "both directions" plan)

## Files touched
- `supabase/migrations/<new>.sql` — `workspace_api_keys` + RLS + GRANTs + RPC
- `supabase/functions/blog-ingest/index.ts` — new
- `src/pages/dashboard/settings/ApiKeysTab.tsx` — new
- `src/pages/dashboard/DashboardSettings.tsx` — register new tab
- `src/hooks/useApiKeys.ts` — new (list/create/revoke)
