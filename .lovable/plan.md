## Goal
Stop NexusFlo24 from auto-restoring (and scroll-jumping to) the last page a user was on before they left. Users find it disruptive — when they come back, the app should land on the default Overview, not bounce them back to wherever they were.

## Changes

1. **`src/components/auth/RedirectIfAuth.tsx`**
   - Remove the `resolveRestoreTarget` lookup.
   - Always redirect authenticated users to `/dashboard/{preferredWorkspaceId}/overview`.

2. **`src/pages/DashboardRedirect.tsx`**
   - Same: drop `resolveRestoreTarget`, always send to `/dashboard/{firstWorkspaceId}/overview`.

3. **`src/hooks/useRouteMemory.ts`**
   - Neutralize the hook (no-op) so we stop writing `last_route` to localStorage / `profiles.last_route` and stop auto-scrolling to a stored `scrollY` on mount.
   - Keeping the file as a no-op avoids touching every caller; `DashboardLayout` continues to import it harmlessly.

4. **Cleanup on load** (in the neutralized hook): on first run per session, clear any existing `nf24:lastRoute*` localStorage keys for the current user so stale entries don't linger.

## Out of scope
- Not removing the `profiles.last_route` column or the `routeMemory.ts` helpers (kept for safety; just unused). Can be deleted later if desired.
- Normal browser refresh (F5) on a dashboard page will still keep the user on that page — that's standard browser behavior, not our restore logic. Only the cross-session "you left and came back" restore is removed.

## Verification
- Log in fresh → lands on Overview, not the previously visited deep page.
- Navigate to Leads, close tab, reopen and log in → lands on Overview.
- No scroll jump on page mount.
