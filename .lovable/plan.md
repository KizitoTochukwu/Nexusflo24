# Platform Admin — Hardening Follow-ups

Builds the five deferred polish items from the Phases 3–4 completion report. All additive, all using the existing patterns (staff-guarded security-definer RPCs, audited `platform-admin-action` mutations, permission-gated UI, honest "Not tracked" states).

## 1. Compatibility redirects for legacy admin routes
- `App.tsx`: replace the three legacy element mounts (`/dashboard/:workspaceId/admin/blog`, `admin/store-orders`, `admin/store-catalogue`) with `<Navigate>` redirects to `/platform-admin/content`, `/platform-admin/fulfilment`, and `/platform-admin/fulfilment` respectively.
- Keep the `bare` props on `AdminBlogManager` / `AdminStoreOrders` (they're now only rendered inside platform-admin; the dashboard-layout wrapper becomes unused, which is fine).
- Non-staff users hitting a legacy URL land on the existing platform-admin access gate — no information leak.

## 2. Scheduled publishing for blog posts
- Migration: add nullable `scheduled_for timestamptz` to `blog_posts` (no GRANT/policy changes needed — existing policies cover the new column).
- `AdminBlogManager`: when status is set to "scheduled", require a `scheduled_for` datetime in the edit dialog.
- Auto-publish: a small `SECURITY DEFINER` RPC `publish_due_blog_posts()` invoked from a new scheduled job (`scheduled_jobs`, hourly) that flips `status` to `published` and sets `published_at` where `scheduled_for <= now()`. Falls back to manual publish if the job hasn't run.
- `PlatformContent.tsx`: add a "Scheduled queue" panel above the blog manager listing upcoming `scheduled_for` posts with countdown, and a "Publish now" action (reuses existing post update path, audited via platform content permissions).

## 3. Last sign-in data on access reviews
- New RPC `platform_staff_last_sign_in()`: security-definer, staff-guarded (`is_platform_staff`), returns `user_id → last_sign_in_at` for current `platform_staff_assignments` by joining `auth.users` (read-only; never touches auth schema objects).
- `PlatformSecurity.tsx`: add a "Last sign in" column to the staff grants table and flag staff with no sign-in in 90+ days as "Stale — recommend review".

## 4. Policy & RLS documentation section
- New checked-in doc `docs/platform-security-notes.md`: summary of the platform-admin permission model, RLS approach per sensitive table group, audited-action guarantees, and known intentional exceptions (e.g. SECURITY DEFINER RPC pattern).
- `PlatformSecurity.tsx`: new "Policies & access model" card rendering a condensed, clearly-labelled static summary ("documentation, not live scanning") with a note pointing super-admins at the repo file for the full version.

## 5. Academy catalogue improvements
- `PlatformAcademy.tsx`: richer per-course display from the existing `courses` data — expandable modules/lessons list, premium flag, and a truthful "courses are file-defined; edit in `src/data/academyCourses.ts`" notice (no fake editor).

## Verification
- Build clean; `rg` confirms no legacy admin element mounts remain.
- Linter: warnings stay at the reviewed baseline except the two new staff-guarded SECURITY DEFINER functions.
- Browser smoke as platform super-admin: legacy `/dashboard/:ws/admin/blog` redirects; schedule a post in the future, confirm it appears in the queue, set it to past and run `publish_due_blog_posts()`; Security page shows last-sign-in and policy notes; Academy page expands a course.

## Technical notes
- One migration, additive only: `blog_posts.scheduled_for`, `publish_due_blog_posts()` (revoked from PUBLIC/anon, granted to authenticated, internally staff-guarded), `platform_staff_last_sign_in()` (same guard pattern), and the `scheduled_jobs` row for hourly publishing.
- All new RPCs: `SECURITY DEFINER`, `SET search_path = public`, explicit REVOKE/GRANT.
- No drops, renames, or weakened policies.
