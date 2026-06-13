## Goal
When a user returns to NexusFlo24 — after refresh, login, browser reopen, or session timeout — automatically reopen the exact page they were last viewing (route, query params, hash). Fall back to the dashboard only if the page is unavailable.

## Scope (Phase 1 — Route + query + scroll)
- Persist: full path + query string + hash + scroll position
- Scope: per `(user_id, workspace_id)`
- Restore on: post-login redirect, hitting `/dashboard` root, hitting `DashboardRedirect`, and on hard refresh of dashboard pages (scroll only)
- Fall back to `/dashboard/:workspaceId/overview` if the stored route 404s or the workspace is missing

## Out of scope (deferred)
- Persisting in-page state like table filters, search input, pagination, open drawers/tabs. (Most of these aren't currently URL-driven; persisting them safely needs per-page wiring. Can be a Phase 2 once each list page reflects state in the URL.)

## Storage strategy
Hybrid:
1. **localStorage** (`nf24:lastRoute:<userId>:<workspaceId>` → `{ path, scrollY, savedAt }`) — instant, no network on every navigation.
2. **Supabase mirror** in `profiles` (`last_route jsonb`) — survives new device / cleared storage. Written debounced (every 5s of idle navigation).

`last_route` shape: `{ workspace_id, path, saved_at }`.

## Components to add
1. **`useRouteMemory` hook** — `src/hooks/useRouteMemory.ts`
   - Subscribes to `useLocation()`; on path change debounce-writes to localStorage + profile.
   - Ignores `/login`, `/register`, `/auth/*`, `/unsubscribe`, public `/f/`, `/form/`, `/book/`.
   - Saves `window.scrollY` on `beforeunload` + scroll-end debounce.
2. **`getLastRoute(userId, workspaceId)` util** — `src/lib/routeMemory.ts`
   - Reads localStorage first, falls back to `profiles.last_route`.
   - Validates the path starts with `/dashboard/<workspaceId>/`.
3. **Mount hook** inside `DashboardLayout` so every authenticated dashboard view records its location.
4. **Update `DashboardRedirect`** (`src/pages/DashboardRedirect.tsx`):
   - After resolving workspaces, check `getLastRoute()` for the chosen workspace. If valid → `<Navigate to={lastRoute} replace />`. Otherwise current behavior (overview).
5. **Update `Login.tsx` post-login redirect** and **`RedirectIfAuth.tsx`**:
   - If a `redirect` query param is present, honor it (existing behavior).
   - Else look up last route → navigate there, else `/dashboard`.
6. **Update `AuthCallback.tsx`** to do the same lookup.
7. **Scroll restoration**: on mount of a dashboard page, if `path` matches saved entry, restore `scrollY` once (rAF after content renders).

## DB change
Migration: add `last_route jsonb` column to `public.profiles` (nullable). No new table needed.

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_route jsonb;
```
(Existing RLS already allows users to update their own profile row.)

## Safety / edge cases
- Never restore to a route belonging to a workspace the user no longer has access to → `WorkspaceGuard` already kicks them out; we additionally validate workspace ownership before issuing the `Navigate`.
- Skip restore when the user explicitly navigates to `/login?logout=1` or signs out (clear localStorage entry on `signOut`).
- Skip restore for admin-only routes if `isAdmin` is false → fallback to overview.
- Don't loop: if the stored path equals the current path, no-op.
- Strip volatile params (e.g. Stripe `session_id`) before saving.

## Files to touch
- new `src/hooks/useRouteMemory.ts`
- new `src/lib/routeMemory.ts`
- edit `src/components/dashboard/DashboardLayout.tsx` (mount hook + scroll restore)
- edit `src/pages/DashboardRedirect.tsx`
- edit `src/pages/Login.tsx`
- edit `src/components/auth/RedirectIfAuth.tsx`
- edit `src/pages/AuthCallback.tsx`
- edit `src/contexts/AuthContext.tsx` (clear key on signOut)
- migration: add `profiles.last_route`

## Acceptance
- Navigate to `/dashboard/<ws>/leads/<leadId>`, refresh → same page reloads, scroll restored.
- Log out, log back in → land on the last leads page, not overview.
- Close browser, reopen tomorrow → same restore.
- Visit a non-existent or unauthorized route → land on overview safely.

Want me to also include **Phase 2 (persist filters / search / pagination per list page)** now, or ship Phase 1 first?