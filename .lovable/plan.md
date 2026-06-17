## Problem

When a user switches away from a NexusFlo24 tab and comes back, dashboard pages appear to fully refresh — spinners flash, "Setting up your workspace…" reappears, drawers/forms reset, and scroll position is lost. This is not a real navigation; it's our state being thrown away on every tab refocus.

## Root cause

Supabase's auth client silently refreshes the access token whenever the tab regains focus. That fires `onAuthStateChange("TOKEN_REFRESHED", session)` in `src/contexts/AuthContext.tsx`. Our handler unconditionally does:

```ts
setSession(session);
setUser(session?.user ?? null);
setLoading(false);
setTimeout(() => fetchSubscription(session.user.id), 0);
```

Two things go wrong:

1. `setUser(session.user)` hands React a brand‑new `User` object reference even though the actual user hasn't changed. Anything depending on `user` (not `user.id`) re-runs.
2. `WorkspaceContext` depends on the `user` object reference and calls `setLoading(true)` then refetches workspaces. While `loading=true`, `DashboardRedirect` / `WorkspaceGuard` / `DashboardLayout` show the "Setting up your workspace…" spinner — that's the "refresh" the user sees. Hooks across CRM / Funnels / Automations also see new identities and re-run.

React Query is already configured correctly (`refetchOnWindowFocus: false`, `refetchOnMount: false`), so this is purely an auth + workspace re-render storm, not a Query refetch issue.

## Fix

### 1. `src/contexts/AuthContext.tsx` — dedupe auth events

- In `onAuthStateChange`, only update React state when something meaningful actually changes:
  - Always keep the latest `session` in a ref (for token freshness) but only call `setSession` when `access_token` changed.
  - Only call `setUser` when `session?.user?.id` differs from the previous user id.
  - Only set `loading=false` on `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT` (not on `TOKEN_REFRESHED` / `USER_UPDATED`).
  - Only call `fetchSubscription` on real sign-in or when the user id changes, not on every token refresh.
- Result: a token refresh on tab-focus becomes a no-op for React; the dashboard tree does not re-render.

### 2. `src/contexts/WorkspaceContext.tsx` — depend on stable identity

- Change the effect dependency from `[user, authLoading]` to `[user?.id, authLoading]` so a new `user` object reference (from any future Supabase event) does not retrigger a fetch.
- Track the user id we already loaded workspaces for in a ref; if the same user id is seen again, skip `setLoading(true)` and skip the refetch entirely. (Manual refresh stays available via `refreshWorkspaces`.)
- This removes the "Setting up your workspace…" flash on tab return.

### 3. Sanity sweep

- Confirm no other top-level component listens to `visibilitychange` / `focus` and triggers reloads (already checked — none do).
- Leave React Query defaults as-is.
- Leave `InactivityManager` as-is (60-minute timeout is intentional and unrelated).

## Files to change

- `src/contexts/AuthContext.tsx` — dedupe `onAuthStateChange` handler, gate `fetchSubscription`.
- `src/contexts/WorkspaceContext.tsx` — depend on `user?.id`, skip refetch when id unchanged.

## Verification

1. Log in, open `/dashboard/:workspaceId/leads`, scroll mid-list, open a lead drawer.
2. Switch to another tab for ~2 minutes (long enough for Supabase to refresh the token), then return.
3. Expected: no spinner, no "Setting up your workspace…", drawer stays open, scroll position preserved, no network burst in DevTools.
4. Repeat on `/funnels`, `/automations`, `/campaigns`, `/messages` — same behavior.
5. Sign out / sign in still works; switching workspaces still triggers the proper reload.